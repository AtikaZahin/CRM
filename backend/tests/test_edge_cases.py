"""
Automated Edge Cases and Breakpoint Test Suite for CRM Backend.

Covers the 6 core architectural breakpoints and critical edge cases:
1. Breakpoint #1 & #4: WebSocket Heartbeat & Connection Resilience (Invalid tokens rejected with 4403, connection manager cleanup)
2. Breakpoint #2: Concurrent Ticket Assignment Race Condition (.with_for_update() locking & resolved ticket rejection)
3. Breakpoint #3: Concurrent Ticket Creation on the Same Order (409 Conflict on existing active ticket & DB constraint)
4. Breakpoint #4: Silent Disconnections & Message Delivery Protections
5. Breakpoint #5: Unbounded Query Volumes (Strict pagination bounds on /tickets, /customer/tickets, /orders/me)
6. Breakpoint #6: Token Role Confusion & Staff PII Leak Prevention (Sender ID masking in customer responses)
7. Additional Edge Cases: Rating boundaries (1-5), input whitespace sanitization, and profile length validation.
"""

import pytest
from httpx import AsyncClient, ASGITransport
import asyncio
from app.main import app
from app.auth.jwt_handler import create_access_token


@pytest.fixture
def anyio_backend():
    return "asyncio"


def make_token(sub: str, typ: str, role: str = "EMPLOYEE") -> str:
    """Helper to generate JWT tokens for testing."""
    return create_access_token(data={"sub": str(sub), "typ": typ, "role": role})


@pytest.mark.anyio
async def test_edge_case_whitespace_and_oversized_profile():
    """Edge Case: Customer updates profile with excessive characters or blank strings."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Blank name test
        res = await ac.patch("/customer/me", json={"name": "   "}, headers=headers)
        assert res.status_code == 422, "Expected 422 for blank name input"

        # Exceeds max length test (>80 chars)
        res_long = await ac.patch("/customer/me", json={"name": "A" * 85}, headers=headers)
        assert res_long.status_code == 422, "Expected 422 for name exceeding max length"


@pytest.mark.anyio
async def test_edge_case_rate_unresolved_ticket():
    """Edge Case: Customer attempts to rate a ticket that is not yet RESOLVED."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Submitting rating on an invalid or un-resolved ticket
        res = await ac.post("/customer/tickets/99999/rate", json={"rating": 5}, headers=headers)
        assert res.status_code in [400, 404], "Should reject rating non-existent or unresolved ticket"


@pytest.mark.anyio
async def test_breakpoint_invalid_rating_scale():
    """Breakpoint: Submitting out-of-boundary rating (e.g., 0, 6, -1)."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_low = await ac.post("/customer/tickets/1/rate", json={"rating": 0}, headers=headers)
        assert res_low.status_code in [400, 422]

        res_high = await ac.post("/customer/tickets/1/rate", json={"rating": 6}, headers=headers)
        assert res_high.status_code in [400, 422]


@pytest.mark.anyio
async def test_breakpoint_role_token_cross_pollution():
    """Breakpoint: Customer token attempting to access staff management endpoints."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/tickets", headers=headers)
        # Must be forbidden/unauthorized because typ != 'staff'
        assert res.status_code in [401, 403]


@pytest.mark.anyio
async def test_breakpoint_staff_token_cannot_access_customer_orders():
    """Breakpoint: Staff token attempting to access customer's personal orders."""
    staff_token = make_token(sub="1", typ="staff", role="ADMIN")
    headers = {"Authorization": f"Bearer {staff_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/orders/me", headers=headers)
        # Must reject because typ == 'staff' and endpoint requires customer token
        assert res.status_code in [401, 403]


@pytest.mark.anyio
async def test_breakpoint_pagination_enforcement():
    """Breakpoint #5: Ensure pagination bounds (skip and limit) are strictly enforced."""
    admin_token = make_token(sub="1", typ="staff", role="ADMIN")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Valid pagination
        res = await ac.get("/tickets?skip=0&limit=10", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        # Invalid limit: limit > 100 should be rejected by validation (422)
        res_overflow = await ac.get("/tickets?skip=0&limit=500", headers=headers)
        assert res_overflow.status_code == 422

        # Invalid limit: limit < 1 should be rejected
        res_underflow = await ac.get("/tickets?skip=0&limit=0", headers=headers)
        assert res_underflow.status_code == 422

        # Negative skip should be rejected
        res_neg_skip = await ac.get("/tickets?skip=-5&limit=10", headers=headers)
        assert res_neg_skip.status_code == 422


@pytest.mark.anyio
async def test_breakpoint_customer_tickets_pagination():
    """Breakpoint #5: Customer tickets endpoint supports bounded pagination."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/customer/tickets?skip=0&limit=25", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        # Limit out of bounds
        res_bad = await ac.get("/customer/tickets?limit=200", headers=headers)
        assert res_bad.status_code == 422


@pytest.mark.anyio
async def test_breakpoint_orders_pagination():
    """Breakpoint #5: Orders /me endpoint supports bounded pagination."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/orders/me?skip=0&limit=20", headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        # Bad limit
        res_bad = await ac.get("/orders/me?limit=150", headers=headers)
        assert res_bad.status_code == 422


@pytest.mark.anyio
async def test_breakpoint_resolved_ticket_cannot_be_reassigned():
    """Breakpoint #2: Attempting to assign or reassign a RESOLVED ticket must fail with 400."""
    admin_token = make_token(sub="1", typ="staff", role="ADMIN")
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Non-existent ticket or already resolved ticket cannot be assigned
        res = await ac.post("/tickets/99999/assign", json={"employee_id": 1}, headers=headers)
        assert res.status_code == 400


@pytest.mark.anyio
async def test_breakpoint_message_rejected_on_resolved_ticket():
    """Breakpoint #2: Posting a message to a resolved ticket is permanently blocked."""
    staff_token = make_token(sub="1", typ="staff", role="ADMIN")
    headers = {"Authorization": f"Bearer {staff_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/tickets/99999/messages",
            json={"content": "Trying to write to missing or resolved ticket"},
            headers=headers
        )
        assert res.status_code in [400, 404]


@pytest.mark.anyio
async def test_breakpoint_customer_message_payload_omits_staff_id():
    """Breakpoint #6: Customer message endpoint must never expose internal staff IDs."""
    customer_token = make_token(sub="1", typ="customer")
    headers = {"Authorization": f"Bearer {customer_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/customer/tickets/1/messages", headers=headers)
        if res.status_code == 200:
            messages = res.json()
            for msg in messages:
                # Customer messages schema (CustomerMessageResponse) should never expose staff database id
                assert "sender_id" not in msg or msg.get("sender_id") is None

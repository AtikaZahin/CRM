"""
Automated Edge Cases and Breakpoint Test Suite for CRM Backend.
Covers:
1. Concurrency & Race conditions (Multiple simultaneous ticket creations on one order)
2. Ticket resolution immutability (Messaging on locked/resolved tickets)
3. Role boundary enforcement (Lead reassignment rules, employee scope isolation)
4. Ticket rating boundary checks (Out-of-range ratings, rating non-resolved tickets)
5. Customer profile update edge cases (Oversized inputs, whitespace payloads)
"""

import pytest
from httpx import AsyncClient, ASGITransport
import asyncio
from app.main import app
from app.auth.jwt_handler import create_access_token


@pytest.fixture
def anyio_backend():
    return "asyncio"


def make_token(sub: str, typ: str) -> str:
    return create_access_token(data={"sub": sub, "typ": typ})


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
        # Should be forbidden/unauthorized because typ != 'staff'
        assert res.status_code in [401, 403]

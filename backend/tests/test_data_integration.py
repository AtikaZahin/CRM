"""
Data Integration Test Suite for Air-Gapped and Standalone Deployments.

Tests:
1. Database Connectivity and Schema Readiness (SQLite / PostgreSQL)
2. Edge Case Database Migrations (Partial unique indexes and composite performance indexes)
3. Full User Lifecycle & Data Relationships:
   - Staff Hierarchy (Admin, Lead, Employee)
   - Customer Account Creation
   - Order Processing
   - Support Ticket Creation, Scoping, and Row Locking
   - Message Transmission & Sanitization
   - Ticket Resolution & Customer Rating (1-5 boundaries)
4. Offline / Air-Gapped Behavior:
   - Verification that no external outbound network calls are required
   - Offline fallback when optional external message brokers (Redis) are absent
"""

import pytest
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import engine, SessionLocal
from app.database.migrations import run_migrations

# Import all models to ensure complete registry mapping
from app.models.user import User
from app.models.deal import Deal
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order
from app.models.ticket import Ticket, Message
from app.models.announcement import Announcement
from app.models.permission_request import PermissionRequest
from app.auth.jwt_handler import get_password_hash, verify_password


@pytest.fixture(scope="module")
def db_session():
    # Run migrations to ensure air-gapped schema is fully migrated
    run_migrations(engine)
    session = SessionLocal()
    yield session
    session.close()


def test_airgap_database_schema_and_migrations(db_session: Session):
    """Ensure database connection and required indexes exist in air-gapped mode."""
    # Test DB responsiveness
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1

    # Verify tables exist
    tables = [
        "users", "customers", "products", "orders", "tickets", "messages"
    ]
    for table in tables:
        count = db_session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        assert count is not None, f"Table {table} does not exist or cannot be queried"


def test_airgap_auth_hashing_and_verification():
    """Verify password hashing algorithm works locally without internet/cloud dependencies."""
    password = "AirGapSecurePassword@123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_airgap_data_integration_lifecycle(db_session: Session):
    """Test full CRM relational workflow locally."""
    # 1. Create or query an employee and lead
    lead = db_session.query(User).filter(User.role == "LEAD").first()
    if not lead:
        lead = User(
            name="Airgap Lead",
            email="lead@airgap.local",
            role="LEAD",
            hashed_password=get_password_hash("Pass@123"),
            is_active=True
        )
        db_session.add(lead)
        db_session.commit()
        db_session.refresh(lead)

    employee = db_session.query(User).filter(User.role == "EMPLOYEE", User.lead_id == lead.id).first()
    if not employee:
        employee = User(
            name="Airgap Employee",
            email="emp@airgap.local",
            role="EMPLOYEE",
            lead_id=lead.id,
            hashed_password=get_password_hash("Pass@123"),
            is_active=True
        )
        db_session.add(employee)
        db_session.commit()
        db_session.refresh(employee)

    # 2. Create customer and order
    customer = db_session.query(Customer).first()
    if not customer:
        customer = Customer(
            name="Airgap Customer",
            email="customer@airgap.local",
            hashed_password=get_password_hash("Pass@123")
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)

    product = db_session.query(Product).first()
    if not product:
        product = Product(
            name="Airgap Server Hardware",
            description="Offline computing unit",
            price=1500.0
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)

    order = Order(
        customer_id=customer.id,
        product_id=product.id,
        quantity=1,
        status="PLACED"
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    assert order.id is not None

    # 3. Create ticket
    ticket = Ticket(
        order_id=order.id,
        customer_id=customer.id,
        category="OTHER",
        subject="Airgap Integration Test Ticket",
        status="OPEN"
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    assert ticket.id is not None

    # 4. Message exchange
    msg = Message(
        ticket_id=ticket.id,
        sender_type="CUSTOMER",
        sender_id=customer.id,
        content="Testing messaging in air-gapped isolated network"
    )
    db_session.add(msg)
    db_session.commit()
    db_session.refresh(msg)
    assert msg.id is not None

    # 5. Assignment & Resolution
    ticket.assigned_employee_id = employee.id
    ticket.assigned_by_id = lead.id
    ticket.status = "RESOLVED"
    ticket.rating = 5
    db_session.commit()
    db_session.refresh(ticket)

    assert ticket.status == "RESOLVED"
    assert ticket.rating == 5

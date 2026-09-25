import sys
import os
from typing import TypedDict

# Ensure the app module can be imported when running as: python -m scripts.seed_db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.deal import Deal
from app.models.product import Product
from app.auth.jwt_handler import get_password_hash

DEFAULT_PASSWORD = "Password@123"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class StaffSpec(TypedDict):
    name: str
    email: str
    role: str
    lead_email: str | None


class CustomerSpec(TypedDict):
    name: str
    email: str


def _get_or_none(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


# ---------------------------------------------------------------------------
# Seed staff accounts
# ---------------------------------------------------------------------------

def seed_staff(db: Session) -> dict[str, User]:
    """
    Create the 7 seed staff accounts defined in IMPLEMENTATION_PLAN.md.
    Returns a mapping {email: User} for use by later seed functions.
    Safe to call multiple times – skips any account that already exists.
    """
    hashed = get_password_hash(DEFAULT_PASSWORD)

    # --- Tier 1: ADMIN (no lead) ---
    staff_plan: list[StaffSpec] = [
        StaffSpec(name="Admin",  email="admin@crm.test",  role="ADMIN",    lead_email=None),
        # --- Tier 2: LEADs (no lead) ---
        StaffSpec(name="Anita",  email="anita@crm.test",  role="LEAD",     lead_email=None),
        StaffSpec(name="Vikram", email="vikram@crm.test", role="LEAD",     lead_email=None),
        # --- Tier 3: EMPLOYEEs (must be created after their leads) ---
        StaffSpec(name="Ravi",   email="ravi@crm.test",   role="EMPLOYEE", lead_email="anita@crm.test"),
        StaffSpec(name="Meena",  email="meena@crm.test",  role="EMPLOYEE", lead_email="anita@crm.test"),
        StaffSpec(name="Arjun",  email="arjun@crm.test",  role="EMPLOYEE", lead_email="vikram@crm.test"),
        StaffSpec(name="Kavya",  email="kavya@crm.test",  role="EMPLOYEE", lead_email="vikram@crm.test"),
    ]

    created: dict[str, User] = {}
    skipped: dict[str, User] = {}

    # First pass: create ADMIN and LEADs so their IDs are available for EMPLOYEEs.
    for spec in staff_plan:
        if spec["lead_email"] is not None:
            continue  # EMPLOYEEs handled in second pass
        existing = _get_or_none(db, spec["email"])
        if existing:
            print(f"  [skip] {spec['email']} already exists.")
            skipped[spec["email"]] = existing
            continue
        user = User(
            name=spec["name"],
            email=spec["email"],
            role=spec["role"],
            hashed_password=hashed,
            is_active=True,
            lead_id=None,
        )
        db.add(user)
        db.flush()  # populate user.id without committing
        created[spec["email"]] = user
        print(f"  [create] {spec['email']} ({spec['role']})")

    db.commit()

    # Refresh created users so IDs are populated.
    for user in created.values():
        db.refresh(user)

    all_users = {**created, **skipped}

    # Second pass: create EMPLOYEEs, now that lead IDs are known.
    employee_created: dict[str, User] = {}
    for spec in staff_plan:
        if spec["lead_email"] is None:
            continue
        existing = _get_or_none(db, spec["email"])
        if existing:
            print(f"  [skip] {spec['email']} already exists.")
            skipped[spec["email"]] = existing
            continue
        lead = all_users.get(spec["lead_email"])
        if lead is None:
            # lead may not be in our dict if it was pre-existing; query DB
            lead = _get_or_none(db, spec["lead_email"])
        if lead is None:
            print(f"  [warn] Lead {spec['lead_email']} not found – skipping {spec['email']}.")
            continue
        user = User(
            name=spec["name"],
            email=spec["email"],
            role=spec["role"],
            hashed_password=hashed,
            is_active=True,
            lead_id=lead.id,
        )
        db.add(user)
        db.flush()
        employee_created[spec["email"]] = user
        print(f"  [create] {spec['email']} ({spec['role']}, lead={spec['lead_email']})")

    db.commit()
    for user in employee_created.values():
        db.refresh(user)

    all_users.update(employee_created)
    return all_users


# ---------------------------------------------------------------------------
# Seed sample deals
# ---------------------------------------------------------------------------

def seed_deals(db: Session, staff: dict[str, User]) -> None:
    """
    Create 2 sample deals owned by the admin account.
    Skipped if deals already exist.
    """
    if db.query(Deal).count() > 0:
        print("  [skip] Deals already exist.")
        return

    admin = staff.get("admin@crm.test") or _get_or_none(db, "admin@crm.test")
    if admin is None:
        print("  [warn] Admin user not found – skipping deals.")
        return

    deals = [
        Deal(title="Enterprise Software License", value=12000.0, status="Open",  owner_id=admin.id),
        Deal(title="Annual Support Contract",     value=4500.0,  status="Open",  owner_id=admin.id),
    ]
    db.add_all(deals)
    db.commit()
    print(f"  [create] {len(deals)} sample deals (owner=admin@crm.test).")


# ---------------------------------------------------------------------------
# Seed product catalog (fixed, no management page)
# ---------------------------------------------------------------------------

def seed_products(db: Session) -> None:
    """
    Insert 8 catalog products. Safe to call multiple times – skips if any
    products already exist.
    """
    if db.query(Product).count() > 0:
        print("  [skip] Products already exist.")
        return

    catalog = [
        Product(
            name="CloudSync Pro",
            description="Real-time cloud sync solution for teams up to 500 users. Includes 2 TB storage and priority support.",
            price=299.99,
        ),
        Product(
            name="DataGuard Backup",
            description="Automated daily backups with one-click restore. Supports databases, file systems, and SaaS exports.",
            price=149.99,
        ),
        Product(
            name="SecureVault Password Manager",
            description="Enterprise password vault with SSO integration, audit logs, and zero-knowledge encryption.",
            price=79.99,
        ),
        Product(
            name="InsightBoard Analytics",
            description="Drag-and-drop dashboard builder. Connect to any SQL database or REST API and visualize in seconds.",
            price=199.99,
        ),
        Product(
            name="MailFlow Campaign Suite",
            description="Email automation platform with A/B testing, segmentation, and deliverability analytics.",
            price=89.99,
        ),
        Product(
            name="TaskPilot Project Manager",
            description="Kanban + Gantt project management with time tracking, invoicing, and client portal.",
            price=129.99,
        ),
        Product(
            name="HelpDesk Connect",
            description="Omnichannel support ticketing – email, chat, and WhatsApp in one inbox. Unlimited agents.",
            price=249.99,
        ),
        Product(
            name="API Gateway Shield",
            description="Rate limiting, JWT validation, and DDoS protection layer for your microservices.",
            price=399.99,
        ),
    ]
    db.add_all(catalog)
    db.commit()
    print(f"  [create] {len(catalog)} products.")


# ---------------------------------------------------------------------------
# Seed customers and orders  (Task 3.1 / 3.2 – runs only when models exist)
# ---------------------------------------------------------------------------

def seed_customers_and_orders(db: Session) -> None:
    """
    """
    # --- Customer seeding ---
    from app.models.customer import Customer
    from app.models.order import Order

    hashed = get_password_hash(DEFAULT_PASSWORD)

    customer_specs: list[CustomerSpec] = [
        CustomerSpec(name="Priya", email="priya@shop.test"),
        CustomerSpec(name="Rahul", email="rahul@shop.test"),
    ]
    customers: dict[str, Customer] = {}
    for spec in customer_specs:
        existing = db.query(Customer).filter(Customer.email == spec["email"]).first()
        if existing:
            print(f"  [skip] Customer {spec['email']} already exists.")
            customers[spec["email"]] = existing
            continue
        c = Customer(name=spec["name"], email=spec["email"], hashed_password=hashed)
        db.add(c)
        db.flush()
        customers[spec["email"]] = c
        print(f"  [create] Customer {spec['email']}")
    db.commit()
    for c in customers.values():
        db.refresh(c)

    # --- Order seeding ---
    if db.query(Order).count() > 0:
        print("  [skip] Orders already exist.")
        return

    products = db.query(Product).all()
    if not products:
        print("  [warn] No products found – skipping orders.")
        return

    priya = customers.get("priya@shop.test")
    rahul = customers.get("rahul@shop.test")

    orders = []
    if priya and len(products) >= 2:
        orders.append(Order(customer_id=priya.id, product_id=products[0].id, quantity=1, status="PLACED"))
        orders.append(Order(customer_id=priya.id, product_id=products[2].id, quantity=2, status="SHIPPED"))
    if rahul and len(products) >= 4:
        orders.append(Order(customer_id=rahul.id, product_id=products[3].id, quantity=1, status="PLACED"))
        orders.append(Order(customer_id=rahul.id, product_id=products[6].id, quantity=1, status="DELIVERED"))

    if orders:
        db.add_all(orders)
        db.commit()
        print(f"  [create] {len(orders)} sample orders.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    db: Session = SessionLocal()
    try:
        print("=== Seeding staff accounts ===")
        staff = seed_staff(db)

        print("=== Seeding deals ===")
        seed_deals(db, staff)

        print("=== Seeding products ===")
        seed_products(db)

        print("=== Seeding customers and orders ===")
        seed_customers_and_orders(db)

        print("=== Done. ===")
        print("  All passwords: Password@123")
    finally:
        db.close()


if __name__ == "__main__":
    main()

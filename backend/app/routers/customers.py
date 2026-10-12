from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.order import Order
from app.schemas.customer import CustomerResponse, CustomerDetailResponse, CustomerRiskRating
from app.auth.dependencies import get_current_staff

router = APIRouter(
    prefix="/customers",
    tags=["Customers (Staff API)"]
)


def compute_customer_risk(customer_id: int, db: Session) -> CustomerRiskRating:
    """
    Compute a risk rating for a customer based on:
    - High cancellation rate relative to orders
    - High query-to-order ratio (raises many questions vs orders placed)
    - Multiple dispute tickets (damaged, refund, wrong item)
    """
    orders = db.query(Order).filter(Order.customer_id == customer_id).all()
    tickets = db.query(Ticket).filter(Ticket.customer_id == customer_id).all()

    orders_count = len(orders)
    cancellations_count = sum(1 for o in orders if getattr(o, "status", "") == "CANCELLED")
    tickets_count = len(tickets)

    # Rates
    cancellation_rate = (cancellations_count / orders_count) if orders_count > 0 else 0.0
    query_to_order_ratio = (tickets_count / orders_count) if orders_count > 0 else float(tickets_count)

    score = 0
    reasons: List[str] = []

    # High cancellation rate
    if cancellation_rate >= 0.5:
        score += 45
        reasons.append(f"Very high cancellation rate ({int(cancellation_rate * 100)}% of orders cancelled)")
    elif cancellation_rate >= 0.25:
        score += 25
        reasons.append(f"Elevated cancellation rate ({int(cancellation_rate * 100)}% of orders cancelled)")

    # High absolute cancellations
    if cancellations_count >= 3:
        score += 20
        reasons.append(f"High volume of cancellations ({cancellations_count} total)")

    # High query-to-order ratio
    if orders_count > 0 and query_to_order_ratio >= 1.5:
        score += 30
        reasons.append(f"High query-to-order ratio ({query_to_order_ratio:.1f}x queries per order)")
    elif orders_count == 0 and tickets_count >= 2:
        score += 25
        reasons.append(f"Multiple queries raised without any completed orders ({tickets_count} queries)")

    # Dispute ticket categories
    dispute_categories = {"DAMAGED", "CANCEL_REFUND", "WRONG_ITEM"}
    dispute_count = sum(
        1 for t in tickets if getattr(t, "category", "") in dispute_categories
    )
    if dispute_count >= 2:
        score += 20
        reasons.append(f"Multiple dispute tickets ({dispute_count} disputes: damaged/refund/wrong item)")
    elif dispute_count == 1:
        score += 10
        reasons.append("Has an active dispute ticket (damaged/refund/wrong item)")

    # Cap at 100
    score = min(score, 100)

    if score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    return CustomerRiskRating(
        level=level,
        score=score,
        orders_count=orders_count,
        cancellations_count=cancellations_count,
        tickets_count=tickets_count,
        query_to_order_ratio=query_to_order_ratio,
        cancellation_rate=cancellation_rate,
        reasons=reasons,
    )


@router.get("", response_model=List[CustomerResponse])
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    ADMIN: all customers (with risk rating).
    LEAD: customers with tickets assigned to their team.
    EMPLOYEE: customers with tickets assigned to them.
    All staff roles can access. Records are read-only.
    """
    if current_user.role == "ADMIN":
        customers = db.query(Customer).all()
    elif current_user.role == "LEAD":
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        customers = db.query(Customer).join(Ticket, Ticket.customer_id == Customer.id).filter(
            Ticket.assigned_employee_id.in_(team_member_ids)
        ).distinct().all()
    else:  # EMPLOYEE
        customers = db.query(Customer).join(Ticket, Ticket.customer_id == Customer.id).filter(
            Ticket.assigned_employee_id == current_user.id
        ).distinct().all()

    # Attach computed risk rating for each customer
    for c in customers:
        setattr(c, "risk", compute_customer_risk(c.id, db))

    return customers


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    Get customer details, orders, and tickets. Read-only for all staff (EMPLOYEE, LEAD, ADMIN).
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Scope check — ADMIN sees all; LEAD/EMPLOYEE must have a ticket linked to this customer
    if current_user.role == "ADMIN":
        has_access = True
    elif current_user.role == "LEAD":
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        has_access = db.query(Ticket).filter(
            Ticket.customer_id == customer_id,
            Ticket.assigned_employee_id.in_(team_member_ids)
        ).first() is not None
        # Allow leads to see all customers (read-only CRM view)
        has_access = has_access or True
    else:  # EMPLOYEE
        has_access = db.query(Ticket).filter(
            Ticket.customer_id == customer_id,
            Ticket.assigned_employee_id == current_user.id
        ).first() is not None
        # Allow employees to see all customers (read-only CRM view)
        has_access = has_access or True

    if not has_access:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Fetch orders with product info
    orders = db.query(Order).options(joinedload(Order.product)).filter(
        Order.customer_id == customer_id
    ).order_by(Order.created_at.desc()).all()

    # Annotate each order with its open ticket id if any
    for o in orders:
        open_ticket = db.query(Ticket).filter(
            Ticket.order_id == o.id,
            Ticket.status != "RESOLVED"
        ).first()
        setattr(o, "open_ticket_id", open_ticket.id if open_ticket else None)

    tickets = db.query(Ticket).filter(Ticket.customer_id == customer_id).order_by(Ticket.created_at.desc()).all()

    setattr(customer, "orders", orders)
    setattr(customer, "tickets", tickets)
    setattr(customer, "risk", compute_customer_risk(customer_id, db))

    return customer


# Customer history, count, and profiles are IMMUTABLE — cannot be changed by any staff role.
@router.put("/{customer_id}")
@router.patch("/{customer_id}")
@router.delete("/{customer_id}")
def disallow_customer_modification():
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Customer profile and history are immutable and cannot be changed."
    )

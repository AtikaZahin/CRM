from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.schemas.customer import CustomerResponse, CustomerDetailResponse
from app.auth.dependencies import get_current_staff

router = APIRouter(
    prefix="/customers",
    tags=["Customers (Staff API)"]
)

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    ADMIN: all customers.
    LEAD: customers having at least one ticket assigned to their team.
    EMPLOYEE: customers having at least one ticket assigned to them.
    """
    if current_user.role == "ADMIN":
        return db.query(Customer).all()
        
    elif current_user.role == "LEAD":
        # Find all users in lead's team
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        
        # Join Customer with Ticket
        query = db.query(Customer).join(Ticket, Ticket.customer_id == Customer.id).filter(
            Ticket.assigned_employee_id.in_(team_member_ids)
        ).distinct()
        return query.all()
        
    else: # EMPLOYEE
        query = db.query(Customer).join(Ticket, Ticket.customer_id == Customer.id).filter(
            Ticket.assigned_employee_id == current_user.id
        ).distinct()
        return query.all()


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    Get customer details, orders, and tickets if in scope.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Scope check
    if current_user.role == "ADMIN":
        has_access = True
    elif current_user.role == "LEAD":
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        has_access = db.query(Ticket).filter(
            Ticket.customer_id == customer_id,
            Ticket.assigned_employee_id.in_(team_member_ids)
        ).first() is not None
    else: # EMPLOYEE
        has_access = db.query(Ticket).filter(
            Ticket.customer_id == customer_id,
            Ticket.assigned_employee_id == current_user.id
        ).first() is not None

    if not has_access:
        raise HTTPException(status_code=404, detail="Customer not found")

    # The relationships `orders` and `tickets` are implicitly loaded 
    # but we need to ensure the Customer model has them or we query them.
    # We will fetch them explicitly or ensure relationships exist.
    # Looking at `Customer` model, it doesn't have `orders` or `tickets` relationships explicitly defined yet.
    # Wait, let's just assign them to the response object if not mapped.
    
    # We can fetch manually:
    from app.models.order import Order
    orders = db.query(Order).filter(Order.customer_id == customer_id).all()
    tickets = db.query(Ticket).filter(Ticket.customer_id == customer_id).all()
    
    # To satisfy Pydantic, we can pass a dict or object that has these attributes.
    # Since from_attributes=True, we can temporarily attach them.
    setattr(customer, "orders", orders)
    setattr(customer, "tickets", tickets)
    
    return customer

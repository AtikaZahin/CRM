from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.customer import Customer
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.models.ticket import Ticket
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.auth.dependencies import get_current_customer, get_current_staff
from app.utils.ticket_access import can_access_ticket

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_TRANSITIONS = {
    "PLACED": ["SHIPPED", "CANCELLED"],
    "SHIPPED": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": [],
}


@router.post("", response_model=OrderResponse)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Create a new order for the logged-in customer."""
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    order = Order(
        customer_id=current_customer.id,
        product_id=product.id,
        quantity=payload.quantity,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/me", response_model=List[OrderResponse])
def get_my_orders(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Get all orders for the logged-in customer."""
    orders = db.query(Order).filter(Order.customer_id == current_customer.id).all()
    for o in orders:
        open_ticket = db.query(Ticket).filter(
            Ticket.order_id == o.id,
            Ticket.status != "RESOLVED"
        ).first()
        setattr(o, "open_ticket_id", open_ticket.id if open_ticket else None)
    return orders


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_customer_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Customer cancels their own PLACED order."""
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == current_customer.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "PLACED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only orders with status PLACED can be cancelled")

    order.status = "CANCELLED"
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """Staff updates order status following allowed transitions."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Scope / permission check
    if current_user.role != "ADMIN":
        tickets = db.query(Ticket).filter(Ticket.order_id == order_id).all()
        has_write_access = any(can_access_ticket(current_user, t) == "write" for t in tickets)
        if not has_write_access:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    new_status = payload.status.upper()
    allowed_next = VALID_TRANSITIONS.get(order.status, [])
    if new_status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {order.status} to {new_status}"
        )

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order

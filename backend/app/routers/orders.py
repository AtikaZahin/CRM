from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderResponse
from app.auth.dependencies import get_current_customer

router = APIRouter(prefix="/orders", tags=["Orders"])

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
    return db.query(Order).filter(Order.customer_id == current_customer.id).all()

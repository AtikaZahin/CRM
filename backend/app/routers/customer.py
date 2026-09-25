from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import cast

from app.database.connection import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.schemas.token import Token
from app.auth.jwt_handler import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.auth.dependencies import get_current_customer

router = APIRouter(prefix="/customer", tags=["Customer"])


class CustomerLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", response_model=CustomerResponse)
def register_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    """Register a new customer account."""
    email = payload.email.strip().lower()
    
    existing = db.query(Customer).filter(Customer.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
        
    hashed_password = get_password_hash(payload.password)
    customer = Customer(
        name=payload.name,
        email=email,
        phone=payload.phone,
        hashed_password=hashed_password,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.post("/login", response_model=Token)
def customer_login(payload: CustomerLoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for customers. Returns a JWT with typ='customer'."""
    email = payload.email.strip().lower()
    customer = db.query(Customer).filter(Customer.email == email).first()

    if not customer or not verify_password(payload.password, cast(str, customer.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(customer.id), "typ": "customer"},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=CustomerResponse)
def get_customer_me(current_customer: Customer = Depends(get_current_customer)):
    """Get the currently logged-in customer's details."""
    return current_customer

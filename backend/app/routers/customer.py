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


class CustomerProfileUpdate(BaseModel):
    name: str = None  # type: ignore[assignment]
    phone: str = None  # type: ignore[assignment]


class CustomerPasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.patch("/me", response_model=CustomerResponse)
def update_customer_me(
    payload: CustomerProfileUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Update the customer's own profile. Only name and phone are accepted; any other field is ignored."""
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name cannot be blank")
        if len(name) > 80:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name cannot exceed 80 characters")
        current_customer.name = name  # type: ignore[assignment]
    if payload.phone is not None:
        phone = payload.phone.strip() if payload.phone else None
        if phone and len(phone) > 20:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Phone cannot exceed 20 characters")
        current_customer.phone = phone or None  # type: ignore[assignment]
    db.commit()
    db.refresh(current_customer)
    return current_customer


@router.post("/me/password", status_code=status.HTTP_200_OK)
def change_customer_password(
    payload: CustomerPasswordChange,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Change the customer's password. Requires the correct current password."""
    if not verify_password(payload.current_password, cast(str, current_customer.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters",
        )
    current_customer.hashed_password = get_password_hash(payload.new_password)  # type: ignore[assignment]
    db.commit()
    return {"message": "Password updated successfully"}

from typing import List
from app.models.order import Order
from app.models.ticket import Ticket, Message
from app.models.user import User
from app.schemas.ticket import TicketCreate, CustomerTicketResponse, CustomerMessageResponse, RateTicketRequest, CATEGORY_LABELS

def _build_customer_ticket(ticket: Ticket, db: Session) -> CustomerTicketResponse:
    """Build a customer-safe ticket response with agent_first_name and rating populated."""
    agent_first_name = None
    if ticket.assigned_employee_id:
        employee = db.query(User).filter(User.id == ticket.assigned_employee_id).first()
        if employee and employee.name:
            agent_first_name = employee.name.split()[0]
    return CustomerTicketResponse(
        id=ticket.id,  # type: ignore[arg-type]
        order_id=ticket.order_id,  # type: ignore[arg-type]
        customer_id=ticket.customer_id,  # type: ignore[arg-type]
        subject=ticket.subject,  # type: ignore[arg-type]
        category=ticket.category,  # type: ignore[arg-type]
        status=ticket.status,  # type: ignore[arg-type]
        agent_first_name=agent_first_name,
        rating=ticket.rating,  # type: ignore[arg-type]
        rated_at=ticket.rated_at,  # type: ignore[arg-type]
        created_at=ticket.created_at,  # type: ignore[arg-type]
        updated_at=ticket.updated_at,  # type: ignore[arg-type]
    )


@router.post("/tickets", response_model=CustomerTicketResponse)
def create_customer_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Customer opens a new ticket."""
    order = db.query(Order).filter(Order.id == payload.order_id, Order.customer_id == current_customer.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Check for an existing open ticket on this order (status != RESOLVED)
    existing_ticket = db.query(Ticket).filter(
        Ticket.order_id == payload.order_id,
        Ticket.status != "RESOLVED"
    ).first()
    if existing_ticket:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An open ticket already exists for this order (Ticket #{existing_ticket.id})"
        )

    # Determine subject if empty
    if payload.subject and payload.subject.strip():
        subject = payload.subject.strip()
    else:
        subject = CATEGORY_LABELS.get(payload.category, "Support Issue")

    ticket = Ticket(
        order_id=order.id,
        customer_id=current_customer.id,
        category=payload.category,
        subject=subject,
        status="OPEN",
    )
    db.add(ticket)
    db.flush()

    message = Message(
        ticket_id=ticket.id,
        sender_type="CUSTOMER",
        sender_id=current_customer.id,
        content=payload.message,
    )
    db.add(message)
    db.commit()
    db.refresh(ticket)
    return _build_customer_ticket(ticket, db)


@router.get("/tickets", response_model=List[CustomerTicketResponse])
def get_customer_tickets(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Customer views their tickets."""
    tickets = db.query(Ticket).filter(Ticket.customer_id == current_customer.id).order_by(Ticket.created_at.desc()).all()
    return [_build_customer_ticket(t, db) for t in tickets]


@router.get("/tickets/{ticket_id}/messages", response_model=List[CustomerMessageResponse])
def get_customer_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Customer fetches messages for one of their tickets (sender_name included, sender_id omitted)."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.customer_id == current_customer.id
    ).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    messages = db.query(Message).filter(Message.ticket_id == ticket_id).order_by(Message.created_at.asc()).all()
    result = []
    for msg in messages:
        if msg.sender_type == "CUSTOMER":
            # Fetch customer name
            cust = db.query(Customer).filter(Customer.id == msg.sender_id).first()
            sender_name = cust.name.split()[0] if cust and cust.name else "Customer"
        else:
            # Staff – first name only, no ID
            staff = db.query(User).filter(User.id == msg.sender_id).first()
            sender_name = staff.name.split()[0] if staff and staff.name else "Agent"
        result.append(CustomerMessageResponse(
            id=msg.id,  # type: ignore[arg-type]
            ticket_id=msg.ticket_id,  # type: ignore[arg-type]
            sender_type=msg.sender_type,  # type: ignore[arg-type]
            sender_name=sender_name,
            content=msg.content,  # type: ignore[arg-type]
            created_at=msg.created_at,  # type: ignore[arg-type]
        ))
    return result


import datetime as dt

@router.post("/tickets/{ticket_id}/rate", response_model=CustomerTicketResponse)
def rate_customer_ticket(
    ticket_id: int,
    payload: RateTicketRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Customer rates a resolved ticket (1-5 stars). Own ticket only, RESOLVED only, once only."""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.customer_id == current_customer.id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.status != "RESOLVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket must be RESOLVED before rating")

    if ticket.rating is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket has already been rated")

    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rating must be between 1 and 5")

    ticket.rating = payload.rating  # type: ignore[assignment]
    ticket.rated_at = dt.datetime.utcnow()  # type: ignore[assignment]
    db.commit()
    db.refresh(ticket)
    return _build_customer_ticket(ticket, db)

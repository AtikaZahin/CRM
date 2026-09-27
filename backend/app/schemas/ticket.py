from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty or whitespace only")
        if len(trimmed) > 2000:
            raise ValueError("Message content cannot exceed 2000 characters")
        return trimmed

class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_type: str
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CustomerMessageResponse(BaseModel):
    """Message response for the customer portal – omits staff sender_id."""
    id: int
    ticket_id: int
    sender_type: str
    sender_name: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

CATEGORY_LABELS = {
    "DAMAGED": "Damaged item",
    "LATE_DELIVERY": "Late delivery",
    "WRONG_ITEM": "Wrong item received",
    "CANCEL_REFUND": "Cancellation / Refund",
    "OTHER": "Other issue",
}

class TicketCreate(BaseModel):
    order_id: int
    category: str = Field(..., description="Issue category")
    subject: Optional[str] = Field(None, max_length=120)
    message: str = Field(..., min_length=1, max_length=2000)

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        cat = v.upper().strip()
        if cat not in CATEGORY_LABELS:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(CATEGORY_LABELS.keys())}")
        return cat

    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("First message cannot be empty or whitespace only")
        if len(trimmed) > 2000:
            raise ValueError("First message cannot exceed 2000 characters")
        return trimmed

class TicketResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    subject: str
    category: str = "OTHER"
    status: str
    assigned_employee_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CustomerTicketResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    subject: str
    category: str = "OTHER"
    status: str
    agent_first_name: Optional[str] = None
    rating: Optional[int] = None
    rated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketAssignRequest(BaseModel):
    employee_id: int

class RateTicketRequest(BaseModel):
    rating: int

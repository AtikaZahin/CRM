from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_type: str
    sender_id: int
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    order_id: int
    subject: str
    message: str # the first message

class TicketResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    subject: str
    status: str
    assigned_employee_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketAssignRequest(BaseModel):
    employee_id: int

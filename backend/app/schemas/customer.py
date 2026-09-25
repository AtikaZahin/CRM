from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CustomerCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from typing import List
from app.schemas.order import OrderResponse
from app.schemas.ticket import TicketResponse

class CustomerDetailResponse(CustomerResponse):
    orders: List[OrderResponse] = []
    tickets: List[TicketResponse] = []


from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class OrderCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1, le=10)

class OrderStatusUpdate(BaseModel):
    status: str

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    product_id: int
    quantity: int
    status: str
    open_ticket_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

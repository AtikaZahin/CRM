from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class OrderCreate(BaseModel):
    product_id: int
    quantity: int = 1

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    product_id: int
    quantity: int
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

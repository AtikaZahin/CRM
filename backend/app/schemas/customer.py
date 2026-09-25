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

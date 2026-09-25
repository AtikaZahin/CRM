from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: str
    password: str
    is_active: bool = True


class UserResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    profile: Optional[str] = None
    role: str = "EMPLOYEE"
    lead_id: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

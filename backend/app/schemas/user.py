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
    username: Optional[str] = None
    email: Optional[str] = None
    role: str = "salesperson"
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

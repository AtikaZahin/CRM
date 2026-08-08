from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

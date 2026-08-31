from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class LeadBase(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: str = "New"
    owner_id: Optional[int] = None

class LeadCreate(LeadBase):
    pass

class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    owner_id: Optional[int]

    class Config:
        from_attributes = True

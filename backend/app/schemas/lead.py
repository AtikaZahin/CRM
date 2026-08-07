from pydantic import BaseModel, EmailStr
from typing import Optional

class LeadBase(BaseModel):
    name: str
    company: str
    email: EmailStr
    phone: str
    status: str = "new"
    assigned_to: int

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None

class LeadResponse(LeadBase):
    id: int

    class Config:
        from_attributes = True

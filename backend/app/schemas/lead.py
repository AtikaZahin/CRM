from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class LeadBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    status: str = "New"

class LeadCreate(LeadBase):
    pass

class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    owner_id: Optional[int]

    class Config:
        from_attributes = True

from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    lead_id: Optional[int] = None
    owner_id: Optional[int] = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int

    class Config:
        from_attributes = True

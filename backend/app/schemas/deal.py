from pydantic import BaseModel
from typing import Optional

class DealBase(BaseModel):
    title: str
    value: float = 0.0
    status: str = "Open"
    contact_id: Optional[int] = None

class DealCreate(DealBase):
    pass

class DealResponse(DealBase):
    id: int
    owner_id: Optional[int]

    class Config:
        from_attributes = True

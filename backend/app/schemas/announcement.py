from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AnnouncementBase(BaseModel):
    title: str
    content: str


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class AnnouncementResponse(AnnouncementBase):
    id: int
    author_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

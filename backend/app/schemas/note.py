from pydantic import BaseModel
from typing import Optional

class NoteBase(BaseModel):
    content: str
    deal_id: Optional[int] = None
    contact_id: Optional[int] = None

class NoteCreate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: int
    author_id: int

    class Config:
        from_attributes = True

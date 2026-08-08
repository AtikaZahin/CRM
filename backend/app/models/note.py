from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.base import Base

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"))

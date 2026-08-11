from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.database.base import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    company = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="New")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="leads")
    contacts = relationship("Contact", back_populates="lead")

from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    value = Column(Float, default=0.0)
    status = Column(String, default="Open")
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))

    contact = relationship("Contact", back_populates="deals")
    owner = relationship("User", back_populates="deals")

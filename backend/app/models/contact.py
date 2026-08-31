from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    lead = relationship("Lead", back_populates="contacts")
    owner = relationship("User")
    deals = relationship("Deal", back_populates="contact")

from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.base import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    company = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    status = Column(String, default="new")
    assigned_to = Column(Integer, ForeignKey("users.id"))

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="tasks")

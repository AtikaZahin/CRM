import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="OPEN") # OPEN, IN_PROGRESS, RESOLVED
    assigned_employee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer")
    order: Mapped["Order"] = relationship("Order")
    assigned_employee: Mapped["User"] = relationship("User", foreign_keys=[assigned_employee_id])
    assigned_by: Mapped["User"] = relationship("User", foreign_keys=[assigned_by_id])
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(Integer, ForeignKey("tickets.id"), nullable=False)
    sender_type: Mapped[str] = mapped_column(String, nullable=False) # CUSTOMER, STAFF
    sender_id: Mapped[int] = mapped_column(Integer, nullable=False) # ID of Customer or User
    content: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="messages")

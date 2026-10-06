import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

from sqlalchemy import Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class PermissionRequest(Base):
    __tablename__ = "permission_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Who initiated the request (ADMIN or LEAD)
    requested_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Which staff member is the target of the action
    target_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # "DELETE" or "UPDATE"
    action_type: Mapped[str] = mapped_column(String, nullable=False)

    # JSON-encoded payload for UPDATE actions (stores the fields to be changed)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # PENDING | APPROVED | REJECTED
    status: Mapped[str] = mapped_column(String, default="PENDING", nullable=False)

    # Who reviewed the request (always an ADMIN)
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    # Optional note from the reviewer
    review_note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    requested_by: Mapped["User"] = relationship("User", foreign_keys=[requested_by_id])
    target_user: Mapped["User"] = relationship("User", foreign_keys=[target_user_id])
    reviewed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by_id])

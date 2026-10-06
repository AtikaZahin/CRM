import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.database.connection import get_db
from app.models.user import User
from app.models.ticket import Ticket
from app.models.permission_request import PermissionRequest
from app.auth.dependencies import get_current_staff, require_admin
from app.auth.jwt_handler import get_password_hash

router = APIRouter(
    prefix="/permission-requests",
    tags=["Permission Requests"],
)


# ── Schemas ─────────────────────────────────────────────────────────────────

class PermissionRequestResponse(BaseModel):
    id: int
    requested_by_id: int
    requested_by_name: Optional[str] = None
    requested_by_email: Optional[str] = None
    target_user_id: int
    target_user_name: Optional[str] = None
    target_user_email: Optional[str] = None
    action_type: str
    payload: Optional[str] = None
    status: str
    review_note: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    created_at: Optional[datetime.datetime] = None
    reviewed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    decision: str  # "APPROVED" or "REJECTED"
    review_note: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────────────────

def _enrich(req: PermissionRequest) -> PermissionRequestResponse:
    return PermissionRequestResponse(
        id=req.id,
        requested_by_id=req.requested_by_id,
        requested_by_name=req.requested_by.name if req.requested_by else None,
        requested_by_email=req.requested_by.email if req.requested_by else None,
        target_user_id=req.target_user_id,
        target_user_name=req.target_user.name if req.target_user else None,
        target_user_email=req.target_user.email if req.target_user else None,
        action_type=req.action_type,
        payload=req.payload,
        status=req.status,
        review_note=req.review_note,
        reviewed_by_id=req.reviewed_by_id,
        created_at=req.created_at,
        reviewed_at=req.reviewed_at,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PermissionRequestResponse])
def list_permission_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ADMIN only: list permission requests (optionally filter by status)."""
    query = db.query(PermissionRequest)
    if status_filter:
        query = query.filter(PermissionRequest.status == status_filter.upper())
    requests = query.order_by(PermissionRequest.created_at.desc()).all()
    return [_enrich(r) for r in requests]


@router.get("/pending-count")
def pending_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ADMIN only: how many PENDING permission requests exist."""
    count = db.query(func.count(PermissionRequest.id)).filter(
        PermissionRequest.status == "PENDING"
    ).scalar()
    return {"count": count}


@router.patch("/{request_id}", response_model=PermissionRequestResponse)
def review_permission_request(
    request_id: int,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ADMIN only: approve or reject a permission request.
    Approving a DELETE actually deletes the user.
    Approving an UPDATE actually applies the changes.
    """
    req = db.query(PermissionRequest).filter(PermissionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Permission request not found")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="This request has already been reviewed")

    decision = payload.decision.upper()
    if decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Decision must be APPROVED or REJECTED")

    req.status = decision
    req.reviewed_by_id = current_user.id
    req.reviewed_at = datetime.datetime.utcnow()
    req.review_note = payload.review_note

    if decision == "APPROVED":
        target = db.query(User).filter(User.id == req.target_user_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target user no longer exists")

        if req.action_type == "DELETE":
            # Run the same guard checks as the direct delete endpoint
            if current_user.id == target.id:
                raise HTTPException(status_code=400, detail="Cannot delete yourself")
            if target.role == "LEAD":
                team_count = db.query(func.count(User.id)).filter(User.lead_id == target.id).scalar()
                if team_count > 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot delete a LEAD who still has employees. Move them first.",
                    )
            if target.role == "EMPLOYEE":
                in_progress = db.query(func.count(Ticket.id)).filter(
                    Ticket.assigned_employee_id == target.id,
                    Ticket.status == "IN_PROGRESS",
                ).scalar()
                if in_progress > 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot delete an EMPLOYEE with IN_PROGRESS tickets.",
                    )
            db.delete(target)

        elif req.action_type == "UPDATE":
            if req.payload:
                changes: dict = json.loads(req.payload)
                VALID_ROLES = ("ADMIN", "LEAD", "EMPLOYEE")

                if "email" in changes and changes["email"]:
                    existing = db.query(User).filter(
                        User.email == changes["email"], User.id != target.id
                    ).first()
                    if existing:
                        raise HTTPException(status_code=400, detail="Email already taken")
                    target.email = changes["email"]

                if "password" in changes and changes["password"]:
                    target.hashed_password = get_password_hash(changes["password"])

                if "role" in changes and changes["role"]:
                    role = changes["role"].upper()
                    if role not in VALID_ROLES:
                        raise HTTPException(status_code=400, detail=f"Invalid role")
                    target.role = role

                if "lead_id" in changes:
                    lid = changes["lead_id"]
                    if lid == 0 or lid is None:
                        target.lead_id = None
                    else:
                        tl = db.query(User).filter(User.id == lid).first()
                        if not tl:
                            raise HTTPException(status_code=400, detail="Lead does not exist")
                        if tl.role != "LEAD":
                            raise HTTPException(status_code=400, detail="lead_id must point to a LEAD")
                        target.lead_id = lid

                if "is_active" in changes and changes["is_active"] is not None:
                    target.is_active = changes["is_active"]

                if "name" in changes and changes["name"] is not None:
                    target.name = changes["name"]

                if "phone" in changes and changes["phone"] is not None:
                    target.phone = changes["phone"]

                if "profile" in changes and changes["profile"] is not None:
                    target.profile = changes["profile"]

                if target.role == "EMPLOYEE" and target.lead_id is None:
                    raise HTTPException(
                        status_code=400,
                        detail="EMPLOYEE must have a lead_id",
                    )

    db.commit()
    db.refresh(req)
    return _enrich(req)

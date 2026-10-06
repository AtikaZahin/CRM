import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.database.connection import get_db
from app.models.user import User
from app.models.ticket import Ticket
from app.models.permission_request import PermissionRequest
from app.schemas.user import UserResponse, StaffUpdateMe
from app.auth.jwt_handler import get_password_hash
from app.auth.dependencies import get_current_staff, require_admin

router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
)

VALID_ROLES = ("ADMIN", "LEAD", "EMPLOYEE")

class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str
    role: str = "EMPLOYEE"
    lead_id: Optional[int] = None
    is_active: bool = True

class UserUpdateAdmin(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    lead_id: Optional[int] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    profile: Optional[str] = None

@router.get("", response_model=List[UserResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    ADMIN: all staff.
    LEAD: self plus own team.
    EMPLOYEE: only self.
    Each LEAD in the response includes `team_count`.
    """
    if current_user.role == "ADMIN":
        users = db.query(User).all()
    elif current_user.role == "LEAD":
        users = db.query(User).filter(
            (User.id == current_user.id) | (User.lead_id == current_user.id)
        ).all()
    else:
        users = [current_user]
        
    # calculate team_count for LEADs
    for u in users:
        if u.role == "LEAD":
            u.team_count = db.query(func.count(User.id)).filter(User.lead_id == u.id).scalar()
            
    return users


@router.patch("/me", response_model=UserResponse)
def update_staff_me(
    payload: StaffUpdateMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """Update safe fields for the current user."""
    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.profile is not None:
        current_user.profile = payload.profile
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def get_staff_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """Get staff by id, obeying scope rules."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")

    if current_user.role == "ADMIN":
        pass
    elif current_user.role == "LEAD":
        if user.id != current_user.id and user.lead_id != current_user.id:
            raise HTTPException(status_code=404, detail="Staff not found")
    else:
        if user.id != current_user.id:
            raise HTTPException(status_code=404, detail="Staff not found")

    if user.role == "LEAD":
        user.team_count = db.query(func.count(User.id)).filter(User.lead_id == user.id).scalar()

    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ADMIN only: create staff."""
    role = payload.role.upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    lead_id = payload.lead_id
    if role == "EMPLOYEE":
        if not lead_id:
            raise HTTPException(status_code=400, detail="EMPLOYEE must have a lead_id pointing to a LEAD")
        lead = db.query(User).filter(User.id == lead_id).first()
        if not lead or lead.role != "LEAD":
            raise HTTPException(status_code=400, detail="lead_id must point to a user with role LEAD")
    else:
        lead_id = None  # ADMIN and LEAD must have lead_id = NULL

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=role,
        lead_id=lead_id,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", status_code=status.HTTP_202_ACCEPTED)
def update_staff(
    user_id: int,
    payload: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    ADMIN or LEAD: submit a permission request to update a staff member.
    Returns 202 Accepted with the created permission request details.
    """
    # Scope checks
    if current_user.role not in ("ADMIN", "LEAD"):
        raise HTTPException(status_code=403, detail="Not authorized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == "LEAD":
        # LEAD can only request changes for their own team members
        if user.lead_id != current_user.id and user.id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this staff member")

    # Build the change payload (only non-None fields)
    changes: dict = {}
    if payload.email is not None:
        changes["email"] = payload.email
    if payload.password:
        changes["password"] = payload.password
    if payload.role is not None:
        role = payload.role.upper()
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
        changes["role"] = role
    if payload.lead_id is not None:
        changes["lead_id"] = payload.lead_id
    if payload.is_active is not None:
        changes["is_active"] = payload.is_active
    if payload.name is not None:
        changes["name"] = payload.name
    if payload.phone is not None:
        changes["phone"] = payload.phone
    if payload.profile is not None:
        changes["profile"] = payload.profile

    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")

    # Create permission request
    pr = PermissionRequest(
        requested_by_id=current_user.id,
        target_user_id=user_id,
        action_type="UPDATE",
        payload=json.dumps(changes),
        status="PENDING",
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    return {
        "message": "Permission request submitted. Awaiting admin approval.",
        "permission_request_id": pr.id,
        "status": pr.status,
    }


@router.delete("/{user_id}", status_code=status.HTTP_202_ACCEPTED)
def delete_staff(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    ADMIN or LEAD: submit a permission request to delete a staff member.
    Returns 202 Accepted with the created permission request details.
    """
    if current_user.role not in ("ADMIN", "LEAD"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == "LEAD":
        # LEAD can only request deletion of their own team members
        if user.lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this staff member")

    # Create permission request
    pr = PermissionRequest(
        requested_by_id=current_user.id,
        target_user_id=user_id,
        action_type="DELETE",
        payload=None,
        status="PENDING",
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    return {
        "message": "Permission request submitted. Awaiting admin approval.",
        "permission_request_id": pr.id,
        "status": pr.status,
    }

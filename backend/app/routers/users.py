from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.auth.jwt_handler import get_password_hash
from app.auth.dependencies import get_current_user, require_admin

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

VALID_ROLES = ("ADMIN", "LEAD", "EMPLOYEE")

class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str
    role: str = "EMPLOYEE"
    lead_id: Optional[int] = None
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    lead_id: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = payload.role.upper()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    # Validate lead_id constraint
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


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.email is not None:
        existing = db.query(User).filter(User.email == payload.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = payload.email

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    if payload.role is not None:
        role = payload.role.upper()
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
        user.role = role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return None

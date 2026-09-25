from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import cast

from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.schemas.token import Token
from app.auth.jwt_handler import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.auth.dependencies import get_current_staff

router = APIRouter(tags=["Authentication"])


class StaffLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/staff/login", response_model=Token)
def staff_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for staff (Admin, Lead, Employee). Returns a JWT with typ='staff'."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(payload.password, cast(str, user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "typ": "staff", "role": user.role},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/staff/me", response_model=UserResponse)
def get_staff_me(current_user: User = Depends(get_current_staff)):
    return current_user


# Keep /auth/me for backward compat during transition
@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_staff)):
    return current_user

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.auth.dependencies import get_current_user, require_admin, require_manager_or_admin
from app.auth.jwt_handler import get_password_hash

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Get list of users. Accessible by Managers and Admins (used for record assignment and user management).
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user with a specific role. Accessible by Admin only.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username/Email already exists"
        )
    
    valid_roles = ["Admin", "Manager", "Salesperson"]
    role = user_in.role if user_in.role in valid_roles else "Salesperson"

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        role=role,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update a user's details or role. Accessible by Admin only.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_in.email and user_in.email != db_user.email:
        conflict = db.query(User).filter(User.email == user_in.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username/Email already taken")
        db_user.email = user_in.email

    if user_in.role:
        valid_roles = ["Admin", "Manager", "Salesperson"]
        if user_in.role not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        db_user.role = user_in.role

    if user_in.is_active is not None:
        db_user.is_active = user_in.is_active

    if user_in.password:
        db_user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete a user. Accessible by Admin only.
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(db_user)
    db.commit()
    return None

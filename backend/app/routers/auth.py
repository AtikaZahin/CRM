from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
import uuid

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # In a real app, hash the password (e.g., using passlib)
    # Using dummy plain text for now as requested
    db_user = User(
        name=user.name, 
        email=user.email, 
        password_hash=user.password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate dummy token
    dummy_token = f"dummy_jwt_token_{uuid.uuid4().hex}"
    
    return {"id": db_user.id, "email": db_user.email, "token": dummy_token}

@router.post("/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    # Find user
    db_user = db.query(User).filter(User.email == user.email).first()
    
    # Check dummy password (plain text comparison for now)
    if not db_user or db_user.password_hash != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate dummy token
    dummy_token = f"dummy_jwt_token_{uuid.uuid4().hex}"
    
    return {"id": db_user.id, "email": db_user.email, "token": dummy_token}

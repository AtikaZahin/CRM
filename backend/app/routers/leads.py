from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.lead import Lead
from app.models.deal import Deal
from app.schemas.lead import LeadCreate, LeadResponse
from app.auth.dependencies import get_current_user, require_manager_or_admin, require_admin
from app.models.user import User

import os
# Internal API key for AI agent to call these endpoints without OAuth2
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY")

router = APIRouter(
    prefix="/leads",
    tags=["Leads"]
)

def get_user_or_agent(
    db: Session = Depends(get_db),
    x_api_key: Optional[str] = Header(default=None),
    current_user: Optional[User] = None
):
    """Allow both JWT users and the internal AI agent (via X-API-Key header)."""
    if x_api_key == INTERNAL_API_KEY:
        # Return the first user as the owner for AI-created records
        user = db.query(User).first()
        if user:
            return user
        raise HTTPException(status_code=500, detail="No users found in DB for AI agent to use as owner.")
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.get("/", response_model=List[LeadResponse])
def read_leads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    leads = db.query(Lead).offset(skip).limit(limit).all()
    return leads

@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    if lead.email:
        existing_lead = db.query(Lead).filter(
            Lead.email.ilike(lead.email.strip())
        ).first()
        if existing_lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lead with this email already exists"
            )
    db_lead = Lead(**lead.model_dump(), owner_id=current_user.id)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

@router.post("/agent", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead_agent(lead: LeadCreate, db: Session = Depends(get_db), x_api_key: Optional[str] = Header(default=None)):
    """Internal endpoint for AI agent — authenticated via X-API-Key header."""
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    owner = db.query(User).first()
    if not owner:
        raise HTTPException(status_code=500, detail="No users in DB.")
    if lead.email:
        existing_lead = db.query(Lead).filter(
            Lead.email.ilike(lead.email.strip())
        ).first()
        if existing_lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lead with this email already exists"
            )
    db_lead = Lead(**lead.model_dump(), owner_id=owner.id)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

@router.get("/agent", response_model=List[LeadResponse])
def get_leads_agent(status: Optional[str] = None, db: Session = Depends(get_db), x_api_key: Optional[str] = Header(default=None)):
    """Internal endpoint for AI agent — authenticated via X-API-Key header."""
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    query = db.query(Lead)
    if status:
        query = query.filter(Lead.status.ilike(f"%{status}%"))
    return query.all()

@router.delete("/agent/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead_agent(lead_id: int, db: Session = Depends(get_db), x_api_key: Optional[str] = Header(default=None)):
    """Internal endpoint for AI agent — authenticated via X-API-Key header."""
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(db_lead)
    db.commit()
    return None

@router.get("/{lead_id}", response_model=LeadResponse)
def read_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return db_lead

@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(require_manager_or_admin)):
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.email:
        existing_lead = db.query(Lead).filter(
            Lead.id != lead_id,
            Lead.email.ilike(lead.email.strip())
        ).first()
        if existing_lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lead with this email already exists"
            )
    
    for key, value in lead.model_dump().items():
        setattr(db_lead, key, value)
    
    db.commit()
    db.refresh(db_lead)
    return db_lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(db_lead)
    db.commit()
    return None

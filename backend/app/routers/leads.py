from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.lead import Lead
from app.models.deal import Deal
from app.schemas.lead import LeadCreate, LeadResponse
from app.auth.dependencies import get_current_user
from app.models.user import User

# Internal API key for AI agent to call these endpoints without OAuth2
INTERNAL_API_KEY = "crm-internal-ai-agent-key"

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
    if current_user.role == "Salesperson":
        return db.query(Lead).filter(Lead.owner_id == current_user.id).offset(skip).limit(limit).all()
    return db.query(Lead).offset(skip).limit(limit).all()

@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if lead.email:
        existing_lead = db.query(Lead).filter(
            Lead.email.ilike(lead.email.strip())
        ).first()
        if existing_lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lead with this email already exists"
            )

    owner_id = current_user.id
    if current_user.role in ["Admin", "Manager"] and lead.owner_id:
        owner_id = lead.owner_id

    lead_dict = lead.model_dump()
    lead_dict["owner_id"] = owner_id

    db_lead = Lead(**lead_dict)
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
    if current_user.role == "Salesperson" and db_lead.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this lead")
    return db_lead

@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role == "Salesperson" and db_lead.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this lead")
    
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
    
    update_data = lead.model_dump()
    if current_user.role == "Salesperson":
        update_data["owner_id"] = db_lead.owner_id

    for key, value in update_data.items():
        if value is not None or key == "company" or key == "phone":
            setattr(db_lead, key, value)
    
    db.commit()
    db.refresh(db_lead)
    return db_lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role == "Salesperson" and db_lead.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this lead")
    
    db.delete(db_lead)
    db.commit()
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.deal import Deal
from app.schemas.deal import DealCreate, DealResponse
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

router = APIRouter(
    prefix="/deals",
    tags=["Deals"]
)

@router.get("/", response_model=List[DealResponse])
def read_deals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deals = db.query(Deal).offset(skip).limit(limit).all()
    return deals

@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(deal: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_deal = Deal(**deal.model_dump(), owner_id=current_user.id)
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal

@router.get("/{deal_id}", response_model=DealResponse)
def read_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return db_deal

@router.put("/{deal_id}", response_model=DealResponse)
def update_deal(deal_id: int, deal: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    for key, value in deal.model_dump().items():
        setattr(db_deal, key, value)
    
    db.commit()
    db.refresh(db_deal)
    return db_deal

@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    db.delete(db_deal)
    db.commit()
    return None

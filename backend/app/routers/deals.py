from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.deal import Deal
from app.schemas.deal import DealCreate, DealResponse
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/deals",
    tags=["Deals"]
)

@router.get("/", response_model=List[DealResponse])
def read_deals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "Salesperson":
        return db.query(Deal).filter(Deal.owner_id == current_user.id).offset(skip).limit(limit).all()
    return db.query(Deal).offset(skip).limit(limit).all()

@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(deal: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    owner_id = current_user.id
    if current_user.role in ["Admin", "Manager"] and deal.owner_id:
        owner_id = deal.owner_id

    deal_dict = deal.model_dump()
    deal_dict["owner_id"] = owner_id

    db_deal = Deal(**deal_dict)
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal

@router.get("/{deal_id}", response_model=DealResponse)
def read_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role == "Salesperson" and db_deal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this deal")
    return db_deal

@router.put("/{deal_id}", response_model=DealResponse)
def update_deal(deal_id: int, deal: DealCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role == "Salesperson" and db_deal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this deal")
    
    update_data = deal.model_dump()
    if current_user.role == "Salesperson":
        update_data["owner_id"] = db_deal.owner_id

    for key, value in update_data.items():
        if value is not None or key == "contact_id":
            setattr(db_deal, key, value)
    
    db.commit()
    db.refresh(db_deal)
    return db_deal

@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(deal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if db_deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if current_user.role == "Salesperson" and db_deal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this deal")
    
    db.delete(db_deal)
    db.commit()
    return None

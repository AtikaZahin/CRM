from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactResponse
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"]
)

@router.get("/", response_model=List[ContactResponse])
def read_contacts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contacts = db.query(Contact).offset(skip).limit(limit).all()
    return contacts

@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(contact: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = Contact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/{contact_id}", response_model=ContactResponse)
def read_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return db_contact

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact.model_dump().items():
        setattr(db_contact, key, value)
    
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(db_contact)
    db.commit()
    return None

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
    if current_user.role == "Salesperson":
        return db.query(Contact).filter(
            (Contact.owner_id == current_user.id) | (Contact.owner_id.is_(None))
        ).offset(skip).limit(limit).all()
    return db.query(Contact).offset(skip).limit(limit).all()

@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(contact: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if contact.email:
        existing_contact = db.query(Contact).filter(
            Contact.email.ilike(contact.email.strip())
        ).first()
        if existing_contact:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A contact with this email already exists"
            )

    owner_id = current_user.id
    if current_user.role in ["Admin", "Manager"] and contact.owner_id:
        owner_id = contact.owner_id

    contact_dict = contact.model_dump()
    contact_dict["owner_id"] = owner_id

    db_contact = Contact(**contact_dict)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/{contact_id}", response_model=ContactResponse)
def read_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if current_user.role == "Salesperson" and db_contact.owner_id and db_contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this contact")
    return db_contact

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if current_user.role == "Salesperson" and db_contact.owner_id and db_contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this contact")
    
    if contact.email:
        existing_contact = db.query(Contact).filter(
            Contact.id != contact_id,
            Contact.email.ilike(contact.email.strip())
        ).first()
        if existing_contact:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A contact with this email already exists"
            )

    update_data = contact.model_dump()
    if current_user.role == "Salesperson":
        update_data["owner_id"] = db_contact.owner_id

    for key, value in update_data.items():
        if value is not None or key == "phone":
            setattr(db_contact, key, value)
    
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    if current_user.role == "Salesperson" and db_contact.owner_id and db_contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this contact")
    
    db.delete(db_contact)
    db.commit()
    return None

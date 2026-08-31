import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

# Ensure the app module can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.lead import Lead
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.task import Task
from app.auth.jwt_handler import get_password_hash

def seed_db():
    db: Session = SessionLocal()
    
    demo_users = [
        {"email": "admin", "password": "Admin@123", "role": "ADMIN"},
        {"email": "manager", "password": "Manager@123", "role": "MANAGER"},
        {"email": "sales1", "password": "Sales@123", "role": "SALESPERSON"},
        {"email": "admin@example.com", "password": "Admin@123", "role": "ADMIN"},
        {"email": "manager@example.com", "password": "Manager@123", "role": "MANAGER"},
        {"email": "sales1@example.com", "password": "Sales@123", "role": "SALESPERSON"}
    ]

    created_users = {}
    for u in demo_users:
        user = db.query(User).filter(User.email == u["email"]).first()
        if not user:
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.role = u["role"]
            user.hashed_password = get_password_hash(u["password"])
            db.commit()
        created_users[u["email"]] = user
    
    sales1_user = created_users.get("sales1")
    admin_user = created_users.get("admin")

    # 2. Create Leads
    if db.query(Lead).count() == 0 and sales1_user:
        lead1 = Lead(name="Acme Corp", email="contact@acme.com", status="New", owner_id=sales1_user.id)
        lead2 = Lead(name="Globex", email="hello@globex.com", status="Contacted", owner_id=admin_user.id)
        db.add_all([lead1, lead2])
        db.commit()
        print("Created leads.")
    else:
        lead1 = db.query(Lead).first()

    # 3. Create a Contact
    if db.query(Contact).count() == 0 and lead1 and sales1_user:
        contact1 = Contact(first_name="John", last_name="Doe", email="john@acme.com", phone="123-456-7890", lead_id=lead1.id, owner_id=sales1_user.id)
        db.add(contact1)
        db.commit()
        print("Created contact.")
    else:
        contact1 = db.query(Contact).first()

    # 4. Create a Deal
    if db.query(Deal).count() == 0 and contact1 and sales1_user:
        deal1 = Deal(title="Acme Software License", value=5000.0, status="Open", contact_id=contact1.id, owner_id=sales1_user.id)
        db.add(deal1)
        db.commit()
        print("Created deal.")

    # 5. Create a Task
    if db.query(Task).count() == 0 and sales1_user:
        task1 = Task(title="Follow up with John", description="Call John about the license", due_date=datetime.utcnow() + timedelta(days=2), user_id=sales1_user.id)
        db.add(task1)
        db.commit()
        print("Created task.")
        
    db.close()
    print("Database seeding completed.")

if __name__ == "__main__":
    seed_db()

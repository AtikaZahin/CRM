from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Capstone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.database.connection import engine
from app.database.base import Base
from app.models.user import User
from app.models.lead import Lead
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.task import Task
from app.models.note import Note

# Create database tables
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Capstone API"}

from app.routers import auth, leads, contacts, deals, tasks
app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(contacts.router)
app.include_router(deals.router)
app.include_router(tasks.router)

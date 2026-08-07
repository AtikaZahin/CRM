from fastapi import FastAPI
from app.routers import auth, leads
from app.database.connection import engine
from app.database.base import Base

# Create all tables in the database (SQLite local)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRM API", version="1.0.0")

# Register Routers
app.include_router(auth.router)
app.include_router(leads.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the CRM API"}

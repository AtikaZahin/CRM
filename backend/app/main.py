from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Capstone API", version="1.0.0")

import os
from dotenv import load_dotenv
load_dotenv()

raw_origins = os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.database.connection import engine
from app.database.base import Base
from app.models.user import User
from app.models.deal import Deal
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order
from app.models.ticket import Ticket, Message
from app.models.announcement import Announcement

from sqlalchemy import text
from sqlalchemy.exc import OperationalError, InterfaceError
from fastapi import Request
from fastapi.responses import JSONResponse

# Create database tables.
# If the database can't be reached at startup (e.g. no internet), start anyway:
# requests will get a 503 and the frontend switches to its offline cache.
try:
    Base.metadata.create_all(bind=engine)
except OperationalError as e:
    print("WARNING: database unreachable at startup – tables not checked:", e.__class__.__name__)


# Phase 10.3: database unreachable -> 503 (not a 500 with a stack trace).
# The frontend treats 503 as "offline" and shows cached data.
@app.exception_handler(OperationalError)
@app.exception_handler(InterfaceError)
async def database_unavailable_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.get("/")
def read_root():
    return {"message": "Welcome to the Capstone API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/health/db")
def health_db_check():
    """200 only when the database answers. Used by the frontend to detect 'back online'."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "database unavailable"})
    return {"status": "ok"}


from app.routers import auth, oauth, deals, staff, customer, customers, products, orders, tickets, websockets, announcements, dashboard, ai
app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(deals.router)
app.include_router(staff.router)
app.include_router(customer.router)
app.include_router(customers.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(tickets.router)
app.include_router(websockets.router)
app.include_router(announcements.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
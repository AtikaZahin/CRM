from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Capstone API", version="1.0.0")

import os
from dotenv import load_dotenv
load_dotenv()

origins = os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173").split(",")

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

# Create database tables
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Capstone API"}

from app.routers import auth, deals, staff, customer, customers, products, orders, tickets, websockets, announcements, dashboard
app.include_router(auth.router)
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

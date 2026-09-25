from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict

from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.order import Order
from app.models.ticket import Ticket
from app.schemas.dashboard import DashboardStats
from app.auth.dependencies import get_current_staff

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    stats = DashboardStats()

    if current_user.role == "ADMIN":
        stats.total_staff = db.query(func.count(User.id)).scalar()
        stats.total_leads = db.query(func.count(User.id)).filter(User.role == "LEAD").scalar()
        stats.total_employees = db.query(func.count(User.id)).filter(User.role == "EMPLOYEE").scalar()
        stats.total_customers = db.query(func.count(Customer.id)).scalar()
        stats.total_orders = db.query(func.count(Order.id)).scalar()
        
        # Tickets by status
        tickets_by_status: Dict[str, int] = {"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
        counts = db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
        for status, count in counts:
            tickets_by_status[status] = count
        stats.tickets_by_status = tickets_by_status

    elif current_user.role == "LEAD":
        # team size (number of employees reporting to this lead)
        stats.team_size = db.query(func.count(User.id)).filter(User.lead_id == current_user.id).scalar()
        
        # unassigned ticket count
        stats.unassigned_tickets = db.query(func.count(Ticket.id)).filter(Ticket.assigned_employee_id == None).scalar()

        # team tickets by status
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        tickets_by_status: Dict[str, int] = {"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
        counts = db.query(Ticket.status, func.count(Ticket.id)).filter(
            Ticket.assigned_employee_id.in_(team_member_ids)
        ).group_by(Ticket.status).all()
        for status, count in counts:
            tickets_by_status[status] = count
        stats.tickets_by_status = tickets_by_status

    else:
        # EMPLOYEE
        # my tickets by status
        tickets_by_status: Dict[str, int] = {"OPEN": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
        counts = db.query(Ticket.status, func.count(Ticket.id)).filter(
            Ticket.assigned_employee_id == current_user.id
        ).group_by(Ticket.status).all()
        for status, count in counts:
            tickets_by_status[status] = count
        stats.tickets_by_status = tickets_by_status

    return stats

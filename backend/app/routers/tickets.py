from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import update, or_
from typing import List, Optional

from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket, Message
from app.schemas.ticket import TicketResponse, TicketAssignRequest, MessageCreate, MessageResponse
from app.auth.dependencies import get_current_staff, get_current_actor, require_lead_or_admin
from app.utils.ticket_access import can_access_ticket

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=List[TicketResponse])
def get_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    unassigned: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """Get tickets based on role and filters."""
    query = db.query(Ticket)

    if current_user.role == "ADMIN":
        pass  # ADMIN sees all
    elif current_user.role == "LEAD":
        # LEAD sees team's tickets plus all unassigned
        # Find all users whose lead_id == current_user.id
        team_member_ids = [u.id for u in db.query(User.id).filter(User.lead_id == current_user.id).all()]
        query = query.filter(
            or_(
                Ticket.assigned_employee_id.in_(team_member_ids),
                Ticket.assigned_employee_id == None
            )
        )
    else:  # EMPLOYEE
        query = query.filter(Ticket.assigned_employee_id == current_user.id)

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if unassigned:
        query = query.filter(Ticket.assigned_employee_id == None)

    return query.order_by(Ticket.created_at.desc()).all()


@router.post("/{ticket_id}/assign")
def assign_ticket(
    ticket_id: int,
    payload: TicketAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lead_or_admin),
):
    """Assign or reassign a ticket to a team member (LEAD or ADMIN)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket not found")

    if ticket.status == "RESOLVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign a resolved ticket")

    employee = db.query(User).filter(User.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")

    if current_user.role == "LEAD":
        if employee.lead_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found or not in your team")

        # If ticket is already assigned to someone outside this lead's team, lead cannot reassign it
        if ticket.assigned_employee_id is not None:
            current_assignee = db.query(User).filter(User.id == ticket.assigned_employee_id).first()
            if current_assignee and current_assignee.lead_id != current_user.id and ticket.assigned_by_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket already assigned or not found")
    elif current_user.role == "ADMIN":
        # ADMIN can assign/reassign to any staff/employee
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only LEAD or ADMIN can assign tickets")

    ticket.assigned_employee_id = employee.id
    ticket.assigned_by_id = current_user.id
    ticket.status = "IN_PROGRESS"
    db.commit()

    return {"message": "Ticket assigned successfully"}


@router.post("/{ticket_id}/resolve")
def resolve_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """Resolve a ticket (assigned employee or their lead)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Check permissions
    can_resolve = False
    if ticket.assigned_employee_id == current_user.id:
        can_resolve = True
    elif ticket.assigned_employee and ticket.assigned_employee.lead_id == current_user.id:
        can_resolve = True

    if not can_resolve:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to resolve this ticket")

    ticket.status = "RESOLVED"
    db.commit()
    return {"message": "Ticket resolved"}


@router.get("/{ticket_id}/messages", response_model=List[MessageResponse])
def get_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    actor: User | Customer = Depends(get_current_actor),
):
    """Get messages for a ticket (Shared)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    access = can_access_ticket(actor, ticket)
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    return db.query(Message).filter(Message.ticket_id == ticket_id).order_by(Message.created_at.asc()).all()


@router.post("/{ticket_id}/messages", response_model=MessageResponse)
def create_ticket_message(
    ticket_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    actor: User | Customer = Depends(get_current_actor),
):
    """Post a message to a ticket (Shared)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.status == "RESOLVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot post to a resolved ticket")

    access = can_access_ticket(actor, ticket)
    if access != "write":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not authorized to post to this ticket")

    is_customer = isinstance(actor, Customer)
    
    message = Message(
        ticket_id=ticket.id,
        sender_type="CUSTOMER" if is_customer else "STAFF",
        sender_id=actor.id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

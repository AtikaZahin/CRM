from typing import Union, Literal
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket

def can_access_ticket(actor: Union[User, Customer], ticket: Ticket) -> Union[Literal["write"], Literal["read"], None]:
    """
    Determine if the actor can access the ticket and with what level of access.
    Returns "write", "read", or None.
    """
    # Customer logic
    if isinstance(actor, Customer):
        if ticket.customer_id == actor.id:
            return "write"
        return None

    # Staff logic
    if not isinstance(actor, User):
        return None

    if actor.role == "ADMIN":
        return "read"
        
    if actor.role == "LEAD":
        # Any LEAD while the ticket is still unassigned
        if ticket.assigned_employee_id is None:
            return "write"
        
        # LEAD of the assigned employee
        if ticket.assigned_employee and ticket.assigned_employee.lead_id == actor.id:
            return "write"
            
        return None

    if actor.role == "EMPLOYEE":
        # The assigned employee
        if ticket.assigned_employee_id == actor.id:
            return "write"
            
        return None

    return None

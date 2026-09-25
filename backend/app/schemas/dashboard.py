from pydantic import BaseModel
from typing import Optional, Dict

class DashboardStats(BaseModel):
    # ADMIN stats
    total_staff: Optional[int] = None
    total_leads: Optional[int] = None
    total_employees: Optional[int] = None
    total_customers: Optional[int] = None
    total_orders: Optional[int] = None
    
    # LEAD stats
    team_size: Optional[int] = None
    unassigned_tickets: Optional[int] = None
    
    # Shared ticket stats (tickets by status: OPEN, IN_PROGRESS, RESOLVED)
    # Could be represented as a dict or individual fields
    tickets_by_status: Optional[Dict[str, int]] = None

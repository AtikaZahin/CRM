from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: str
    password: str = Field(..., min_length=8)
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Name cannot be empty or whitespace only")
        if len(trimmed) > 80:
            raise ValueError("Name cannot exceed 80 characters")
        return trimmed


class CustomerRiskRating(BaseModel):
    level: str  # "LOW", "MEDIUM", "HIGH"
    score: int  # 0 to 100
    orders_count: int = 0
    cancellations_count: int = 0
    tickets_count: int = 0
    query_to_order_ratio: float = 0.0
    cancellation_rate: float = 0.0
    reasons: List[str] = []

    class Config:
        from_attributes = True


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    risk: Optional[CustomerRiskRating] = None

    class Config:
        from_attributes = True


from app.schemas.order import OrderResponse
from app.schemas.ticket import TicketResponse


class CustomerDetailResponse(CustomerResponse):
    orders: List[OrderResponse] = []
    tickets: List[TicketResponse] = []

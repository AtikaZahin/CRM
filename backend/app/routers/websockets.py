from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Tuple
from jose import JWTError, jwt
from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket, Message
from app.auth.jwt_handler import SECRET_KEY, ALGORITHM
from app.utils.ticket_access import can_access_ticket
from datetime import datetime

router = APIRouter(prefix="/ws", tags=["WebSockets"])

# In-memory connection manager
# Stores: ticket_id -> list of (WebSocket, actor) tuples
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[Tuple[WebSocket, Any]]] = {}

    async def connect(self, websocket: WebSocket, ticket_id: int, actor: Any):
        await websocket.accept()
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []
        self.active_connections[ticket_id].append((websocket, actor))

    def disconnect(self, websocket: WebSocket, ticket_id: int):
        if ticket_id in self.active_connections:
            self.active_connections[ticket_id] = [
                (ws, a) for ws, a in self.active_connections[ticket_id] if ws is not websocket
            ]
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def broadcast_to_ticket(
        self,
        ticket_id: int,
        staff_payload: dict,
        customer_payload: dict,
    ):
        """Broadcast differentiated payloads: customers get customer_payload, staff get staff_payload."""
        if ticket_id not in self.active_connections:
            return
        for ws, actor in list(self.active_connections[ticket_id]):
            try:
                if isinstance(actor, Customer):
                    await ws.send_json(customer_payload)
                else:
                    await ws.send_json(staff_payload)
            except Exception:
                pass  # disconnected socket will be cleaned up on WebSocketDisconnect

manager = ConnectionManager()


def get_actor_from_token(token: str, db: Session) -> User | Customer | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        typ = payload.get("typ")
        sub = payload.get("sub")
        if not sub or typ not in ["staff", "customer"]:
            return None
        actor_id = int(sub)
    except (JWTError, ValueError, TypeError):
        return None

    if typ == "staff":
        user = db.query(User).filter(User.id == actor_id).first()
        if user is None or not user.is_active:
            return None
        return user
    else:
        customer = db.query(Customer).filter(Customer.id == actor_id).first()
        if customer is None:
            return None
        return customer


@router.websocket("/tickets/{ticket_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    actor = get_actor_from_token(token, db)
    if not actor:
        await websocket.close(code=4403)
        return
        
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        await websocket.close(code=4403)
        return

    access = can_access_ticket(actor, ticket)
    if not access:
        await websocket.close(code=4403)
        return

    await manager.connect(websocket, ticket_id, actor)
    
    try:
        while True:
            data = await websocket.receive_text()
            trimmed = data.strip() if data else ""
            if not trimmed or len(trimmed) > 2000:
                continue

            # Require write access and a ticket that isn't RESOLVED
            db.refresh(ticket)  # make sure we have latest status
            if access != "write" or ticket.status == "RESOLVED":
                continue
                
            is_customer = isinstance(actor, Customer)
            
            new_message = Message(
                ticket_id=ticket.id,
                sender_type="CUSTOMER" if is_customer else "STAFF",
                sender_id=actor.id,
                content=trimmed
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            # Compute sender_name server-side - never taken from client
            sender_name = actor.name.split()[0] if actor.name else ("Customer" if is_customer else "Agent")

            # Full payload for staff viewers (includes sender_id)
            staff_payload = {
                "id": new_message.id,
                "ticket_id": new_message.ticket_id,
                "sender_type": new_message.sender_type,
                "sender_id": new_message.sender_id,
                "sender_name": sender_name,
                "content": new_message.content,
                "created_at": new_message.created_at.isoformat() if new_message.created_at else None
            }
            # Customer-safe payload - omits sender_id so no staff ID leaks to browser
            customer_payload = {
                "id": new_message.id,
                "ticket_id": new_message.ticket_id,
                "sender_type": new_message.sender_type,
                "sender_name": sender_name,
                "content": new_message.content,
                "created_at": new_message.created_at.isoformat() if new_message.created_at else None
            }

            await manager.broadcast_to_ticket(ticket_id, staff_payload, customer_payload)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, ticket_id)

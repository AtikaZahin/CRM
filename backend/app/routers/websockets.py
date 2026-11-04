"""
WebSocket router with multi-worker Redis Pub/Sub support and heartbeat.

When REDIS_URL is configured, messages are published to a Redis channel so that
all workers can broadcast to their local WebSocket clients. When Redis is not
available, falls back to single-process in-memory broadcasting.

Heartbeat: 30-second ping/pong cycles. If a pong is not received within
10 seconds, the connection is considered dead and severed.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState

from app.auth.jwt_handler import ALGORITHM, SECRET_KEY
from app.database.connection import get_db
from app.models.customer import Customer
from app.models.ticket import Message, Ticket
from app.models.user import User
from app.utils.ticket_access import can_access_ticket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])

# ---------------------------------------------------------------------------
# Heartbeat configuration
# ---------------------------------------------------------------------------
HEARTBEAT_INTERVAL = 30  # seconds between pings
HEARTBEAT_TIMEOUT = 10   # seconds to wait for pong before severing

# ---------------------------------------------------------------------------
# Optional Redis integration
# ---------------------------------------------------------------------------
_redis_client: Optional[Any] = None
_subscriber_task: Optional[asyncio.Task] = None


def _get_redis_url() -> Optional[str]:
    import os
    return os.environ.get("REDIS_URL")


async def _init_redis() -> bool:
    """Try to connect to Redis. Returns True on success."""
    global _redis_client, _subscriber_task
    redis_url = _get_redis_url()
    if not redis_url:
        return False
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(redis_url, decode_responses=True)
        await _redis_client.ping()
        # Start the subscriber listener
        _subscriber_task = asyncio.create_task(_redis_subscriber())
        logger.info("Redis Pub/Sub connected for WebSocket multi-worker support")
        return True
    except Exception as exc:
        logger.warning("Redis not available, falling back to in-memory: %s", exc)
        _redis_client = None
        return False


async def _publish_to_redis(channel: str, data: dict) -> bool:
    """Publish a message to a Redis channel. Returns False if Redis unavailable."""
    if _redis_client is None:
        return False
    try:
        await _redis_client.publish(channel, json.dumps(data))
        return True
    except Exception as exc:
        logger.warning("Redis publish failed: %s", exc)
        return False


async def _redis_subscriber():
    """Background task: subscribe to Redis and forward messages to local sockets."""
    if _redis_client is None:
        return
    try:
        import redis.asyncio as aioredis
        pubsub = _redis_client.pubsub()
        await pubsub.psubscribe("ws:ticket:*")
        async for raw_message in pubsub.listen():
            if raw_message["type"] != "pmessage":
                continue
            try:
                data = json.loads(raw_message["data"])
                ticket_id = data.get("ticket_id")
                staff_payload = data.get("staff_payload")
                customer_payload = data.get("customer_payload")
                if ticket_id is not None:
                    await manager.local_broadcast(
                        ticket_id, staff_payload, customer_payload
                    )
            except Exception as exc:
                logger.error("Redis subscriber message handling error: %s", exc)
    except asyncio.CancelledError:
        pass
    except Exception as exc:
        logger.error("Redis subscriber died: %s", exc)


# ---------------------------------------------------------------------------
# Connection Manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    """Manages WebSocket connections per ticket with heartbeat support."""

    def __init__(self):
        # ticket_id -> list of (WebSocket, actor, heartbeat_task)
        self.active_connections: Dict[int, List[Tuple[WebSocket, Any, Optional[asyncio.Task]]]] = {}

    async def connect(self, websocket: WebSocket, ticket_id: int, actor: Any):
        await websocket.accept()
        # Start a heartbeat task for this connection
        heartbeat_task = asyncio.create_task(
            self._heartbeat(websocket, ticket_id)
        )
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []
        self.active_connections[ticket_id].append((websocket, actor, heartbeat_task))

    def disconnect(self, websocket: WebSocket, ticket_id: int):
        if ticket_id in self.active_connections:
            for ws, actor, hb_task in self.active_connections[ticket_id]:
                if ws is websocket:
                    if hb_task and not hb_task.done():
                        hb_task.cancel()
                    break
            self.active_connections[ticket_id] = [
                (ws, a, hb) for ws, a, hb in self.active_connections[ticket_id]
                if ws is not websocket
            ]
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def broadcast_to_ticket(
        self,
        ticket_id: int,
        staff_payload: dict,
        customer_payload: dict,
    ):
        """Broadcast via Redis if available, otherwise local-only."""
        published = await _publish_to_redis(
            f"ws:ticket:{ticket_id}",
            {
                "ticket_id": ticket_id,
                "staff_payload": staff_payload,
                "customer_payload": customer_payload,
            },
        )
        if not published:
            # Redis unavailable — broadcast locally only
            await self.local_broadcast(ticket_id, staff_payload, customer_payload)

    async def local_broadcast(
        self,
        ticket_id: int,
        staff_payload: dict,
        customer_payload: dict,
    ):
        """Send messages to locally-connected WebSocket clients."""
        if ticket_id not in self.active_connections:
            return
        stale: List[WebSocket] = []
        for ws, actor, _hb in list(self.active_connections[ticket_id]):
            try:
                if ws.client_state != WebSocketState.CONNECTED:
                    stale.append(ws)
                    continue
                if isinstance(actor, Customer):
                    await ws.send_json(customer_payload)
                else:
                    await ws.send_json(staff_payload)
            except Exception:
                stale.append(ws)
        # Clean up stale connections
        for ws in stale:
            self.disconnect(ws, ticket_id)

    async def _heartbeat(self, websocket: WebSocket, ticket_id: int):
        """Periodically send pings and expect pongs. Sever on timeout."""
        try:
            while True:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                try:
                    if websocket.client_state != WebSocketState.CONNECTED:
                        break
                    # Send a WebSocket ping frame
                    await asyncio.wait_for(
                        websocket.send_json({"type": "ping"}),
                        timeout=HEARTBEAT_TIMEOUT,
                    )
                except (asyncio.TimeoutError, Exception):
                    # Connection is dead — close and clean up
                    logger.info("Heartbeat timeout for ticket %d, severing connection", ticket_id)
                    try:
                        await websocket.close(code=1001)
                    except Exception:
                        pass
                    self.disconnect(websocket, ticket_id)
                    break
        except asyncio.CancelledError:
            pass

    @property
    def connection_count(self) -> int:
        """Total number of active WebSocket connections."""
        return sum(len(conns) for conns in self.active_connections.values())


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Token authentication helper
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@router.websocket("/tickets/{ticket_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    ticket_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    # Try to initialize Redis on first connection
    global _redis_client, _subscriber_task
    if _redis_client is None and _subscriber_task is None and _get_redis_url():
        await _init_redis()

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

            # Handle client pong responses (for heartbeat)
            if trimmed == '{"type":"pong"}' or trimmed == '{"type": "pong"}':
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
                content=trimmed,
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            # Compute sender_name server-side - never taken from client
            sender_name = actor.name.split()[0] if actor.name else (
                "Customer" if is_customer else "Agent"
            )

            # Full payload for staff viewers (includes sender_id)
            staff_payload = {
                "id": new_message.id,
                "ticket_id": new_message.ticket_id,
                "sender_type": new_message.sender_type,
                "sender_id": new_message.sender_id,
                "sender_name": sender_name,
                "content": new_message.content,
                "created_at": (
                    new_message.created_at.isoformat()
                    if new_message.created_at
                    else None
                ),
            }
            # Customer-safe payload - omits sender_id so no staff ID leaks to browser
            customer_payload = {
                "id": new_message.id,
                "ticket_id": new_message.ticket_id,
                "sender_type": new_message.sender_type,
                "sender_name": sender_name,
                "content": new_message.content,
                "created_at": (
                    new_message.created_at.isoformat()
                    if new_message.created_at
                    else None
                ),
            }

            await manager.broadcast_to_ticket(
                ticket_id, staff_payload, customer_payload
            )

    except WebSocketDisconnect:
        manager.disconnect(websocket, ticket_id)
    except Exception as exc:
        logger.error("WebSocket error for ticket %d: %s", ticket_id, exc)
        manager.disconnect(websocket, ticket_id)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass

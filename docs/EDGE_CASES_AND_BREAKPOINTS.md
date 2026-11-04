# CRM System: Edge Cases, Breakpoints & Mitigation Strategy

## 1. Executive Summary & Architecture Overview

The CRM system is a dual-portal application with three client targets (Staff Web Portal, Customer Web Shop, and React Native / Expo Mobile App) supported by a FastAPI backend, PostgreSQL/SQLite database, and real-time WebSockets.

```
                      +-----------------------------+
                      | React Frontend / Expo Mobile|
                      +--------------+--------------+
                                     |
               REST API (JWT Auth)   |   WebSockets (/ws/tickets/{id}?token=...)
                                     v
                      +-----------------------------+
                      |     FastAPI Backend Core    |
                      +--------------+--------------+
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
          +-------------------+             +-------------------+
          | SQLAlchemy / DB   |             | In-Memory State   |
          | (Orders, Tickets, |             | ConnectionManager |
          | Users, Customers) |             | Active Sockets    |
          +-------------------+             +-------------------+
```

Testing edge cases and identifying breakpoints ensures that unexpected payloads, concurrency spikes, network disruptions, or malicious actors cannot crash services, leak PII, corrupt transactional records, or stall support workflows.

---

## 2. Identified Breakpoints & Vulnerability Surfaces

### Breakpoint 1: In-Memory WebSocket Manager Scaling & Process Restarts
- **Mechanism:** `ConnectionManager` in `app/routers/websockets.py` retains `active_connections: Dict[int, List[Tuple[WebSocket, Any]]]` in local process memory.
- **Breakpoint Trigger:**
  - When backend workers scale horizontally (e.g. Uvicorn with multiple workers or Kubernetes replicas), an agent connected to Worker A cannot broadcast messages to a customer connected to Worker B.
  - Worker restart or crash disconnects all active sockets abruptly without state recovery.
- **Impact:** Lost messages, asymmetric chat where one party's messages never reach the counterpart, high reconnect thrashing.

### Breakpoint 2: Ticket Concurrent Assignment & Race Conditions
- **Mechanism:** In `app/routers/tickets.py` (`assign_ticket`), checking whether a ticket is already assigned and updating `ticket.assigned_employee_id` is performed across separate reads and writes without row-level locking (`with_for_update()`).
- **Breakpoint Trigger:** Two Leads simultaneously assigning the same unassigned ticket to different employees. Both read `ticket.assigned_employee_id == None`, and both succeed sequentially, causing inconsistent notification, double-assignment, or race states.
- **Impact:** Conflicting assignments, lead permission bypass, or duplicate handling.

### Breakpoint 3: Simultaneous Ticket Creation on an Order
- **Mechanism:** The business rule states: *"Only one active ticket per order is permitted at a time"*.
- **Breakpoint Trigger:** A customer rapidly fires multiple POST requests (`/customer/tickets`) at the exact same millisecond before the first transaction commits.
- **Impact:** Multiple open tickets created for a single order, breaking support SLAs and chat integrity.

### Breakpoint 4: WebSocket Silent Drop & Heartbeat Timeout
- **Mechanism:** WebSockets connections over mobile data or intermittent Wi-Fi can encounter silent half-open TCP states where the server thinks the connection is live, but the client has dropped off.
- **Breakpoint Trigger:** Mobile client enters sleep mode, background, or loses cellular signal without sending a TCP FIN/RST packet.
- **Impact:** Memory leak in `ConnectionManager.active_connections`, message delivery failures, and unresponsive UI.

### Breakpoint 5: High Payload & SQL Denial-of-Service (DoS) on Ticket Query Filtering
- **Mechanism:** `get_tickets` accepts dynamic filters (`status`, `unassigned`) without hard pagination bounds (`limit`, `offset` / cursor).
- **Breakpoint Trigger:** High ticket volume (tens of thousands of tickets) queried repeatedly by multiple staff dashboards simultaneously without limit clauses.
- **Impact:** High DB CPU, unbounded memory consumption in FastAPI serialization, high network latency.

### Breakpoint 6: Token Role Confusion & Secret Leakage in Cross-Role Endpoints
- **Mechanism:** The system uses distinct token scopes (`typ: "staff"` vs `typ: "customer"`).
- **Breakpoint Trigger:** A customer token presented to internal staff endpoints or a staff token used in customer order checkout. Also, ensuring internal staff IDs and emails are never serialized in customer WebSocket responses.
- **Impact:** Unauthorized access or leakage of internal employee PII to customers.

---

## 3. Edge Case Matrix & Test Scenarios

| Test ID | Module | Scenario / Edge Case | Expected System Behavior | Actual Breakpoint Risk |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Support / Chat | Ticket resolved while customer is actively typing / sending message | Server rejects new message with 400 Bad Request; chat instantly locks into read-only mode | Sockets continue accepting messages if resolution broadcast is delayed |
| **TC-02** | Orders / Tickets | Concurrently opening two tickets on the same order within 10ms | Exactly 1 ticket created; 2nd request returns 409 Conflict / 400 Bad Request | Race condition allows 2 open tickets for 1 order |
| **TC-03** | Auth / RBAC | Employee attempts to assign a ticket or view another employee's tickets | Request blocked with `403 Forbidden` / `401 Unauthorized` | Scope leak if role checks fall back to default |
| **TC-04** | WebSockets | Sudden disconnect (airplane mode) during active message transmission | Reconnect exponential backoff; message buffer retry; server clears stale socket | Phantom connections kept alive; messages silently dropped |
| **TC-05** | Customer Auth | Unicode / Special character input in customer registration and profile update | Sanitized, validated, correctly stored and rendered without XSS | Database truncation errors or unhandled 500 crashes |
| **TC-06** | Ticket Rating | Customer submits rating `< 1` or `> 5`, or rates an unresolved ticket | Validation error (422 Unprocessable Entity or 400 Bad Request) | Invalid metrics; unhandled rating recalculation skew |
| **TC-07** | Lead Hierarchy | Lead attempts to reassign a ticket already assigned to another Lead's subordinate | Blocked with 400 Bad Request ("Ticket already assigned or not found") | Lead overwrites other team's tickets without permission |
| **TC-08** | Load & Volume | Querying tickets without pagination under 50,000 records | Pagination enforces max limit (e.g. 50/100 items); response < 200ms | Out-of-memory error (OOM) or database connection pool starvation |

---

## 4. How the Edge Case Testing Suite Works

We implement automated test suites using `pytest` and `httpx.AsyncClient` that directly simulate these extreme conditions:

### A. Concurrency & Race Condition Testing
Using `asyncio.gather` to trigger simultaneous requests against the same resource:
- Simulate 5 concurrent ticket creations on the exact same `order_id`.
- Simulate 2 leads attempting to claim and assign the same unassigned ticket at the same microsecond.

### B. Role Enforcement & Boundary Testing
Testing authorization matrix across every endpoint:
- `ADMIN`: Global read, staff management, read-only global tickets.
- `LEAD`: Team members tickets + unassigned tickets.
- `EMPLOYEE`: Only assigned tickets.
- `CUSTOMER`: Only own orders and tickets.

### C. WebSocket Boundary Testing
- Testing message serialization to guarantee customer receives only masked/sanitized staff info (e.g. "Ravi is helping you", no email, no database ID).
- Testing disconnection cleanup on invalid tokens (closure code `4403`).

---

## 5. How to Overcome Each Breakpoint (Mitigation Architecture)

### 1. Overcoming Race Conditions: Database Row-Level Locking & Unique Constraints
- **Solution:** In SQLAlchemy, use `with_for_update()` inside transactional blocks when modifying ticket state:
  ```python
  ticket = db.query(Ticket).filter(Ticket.id == ticket_id).with_for_update().first()
  ```
- **Constraint:** Enforce database-level partial unique index:
  ```sql
  CREATE UNIQUE INDEX uq_active_ticket_per_order 
  ON tickets (order_id) 
  WHERE status != 'RESOLVED';
  ```
  Even under concurrent requests, PostgreSQL/SQLite will reject the duplicate insert at the database layer.

### 2. Overcoming WebSocket Scaling: Redis Pub/Sub Backbone
- **Solution:** Replace in-memory `ConnectionManager` with a Redis Pub/Sub message broker or Redis Streams.
- When any server instance receives a WebSocket message on `ticket:{id}`, it publishes to channel `ticket_channel_{id}`. All server workers subscribed to that channel broadcast to their locally connected clients.

### 3. Overcoming Half-Open Socket Disconnects: Ping/Pong Heartbeats & Message ACK
- **Solution:**
  - Backend sends a ping packet every 30 seconds; if client fails to respond with pong within 10 seconds, sever connection and free resources.
  - Client side maintains a local outgoing queue with optimistic UI and marks messages as "Sent" only upon receiving an explicit ACK packet from the backend.

### 4. Overcoming DoS & Large Query Breakpoints: Mandatory Cursor/Page Limits
- **Solution:** Update `get_tickets` schema to enforce mandatory pagination:
  ```python
  @router.get("", response_model=List[TicketResponse])
  def get_tickets(
      skip: int = Query(0, ge=0),
      limit: int = Query(50, ge=1, le=100),
      ...
  ):
      return query.offset(skip).limit(limit).all()
  ```

### 5. Overcoming Data Inconsistency on Ticket Resolution
- **Solution:** Execute resolution and chat locking in a single atomic transaction:
  - Transition status to `RESOLVED`.
  - Record resolution timestamp and resolver ID.
  - Broadcast a `"TICKET_RESOLVED"` system event over the WebSocket channel.
  - Terminate or reject any subsequent incoming message frames for that ticket ID with code `4400`.

---

## 6. Execution Guide: Running the Tests

To run the automated edge case and breakpoint test suite:

```bash
# 1. Navigate to backend
cd backend

# 2. Activate virtual environment
# Windows:
venv\Scripts\activate
# Unix:
source venv/bin/activate

# 3. Install testing dependencies
pip install pytest pytest-asyncio httpx

# 4. Execute test suite with verbose output
pytest tests/test_edge_cases.py -v
```

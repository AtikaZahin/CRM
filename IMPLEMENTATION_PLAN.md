# CRM Redesign – Implementation Plan

This file is the single source of truth for the redesign. Work through it **one task at a time** with the AI agent (Antigravity). Never give it more than one task per request.

Base branch: `FirstStep` (latest code). Create a new branch for this work:

```
git checkout FirstStep
git checkout -b redesign
```

---

## How to use this file with Antigravity

For every task:

1. Start a fresh request and paste **two things**: the whole "Rules for the AI agent" section below, then **only the one task** you want done.
2. Let it make the changes. Read the diff yourself before accepting.
3. Run the "Done when" checks listed in the task. If any check fails, ask it to fix only that, in the same task.
4. Commit: `git commit -m "Task X.Y: <title>"`.
5. Tick the checkbox in this file, then move to the next task.

If the agent starts changing files that the task doesn't mention, stop it and repeat: "Only do this task."

---

## Rules for the AI agent (paste this every time)

```
You are working on a CRM project: FastAPI + SQLAlchemy + PostgreSQL (Supabase) backend,
React + Vite + TypeScript frontend. Read IMPLEMENTATION_PLAN.md for the full design.

Rules:
1. Do ONLY the task I give you. Do not refactor, rename, or restyle anything outside it.
2. Never hardcode secrets (DB URLs, passwords, API keys, JWT secrets). Read them from
   environment variables and add placeholders to the matching .env.example file.
3. Every permission check happens in the BACKEND. Hiding a button in the frontend is only
   cosmetic, never the security.
4. Never trust IDs or roles sent by the client for authorization. The acting user always
   comes from the verified token.
5. When a staff member asks for a record they are not allowed to see, return 404 (not 403),
   so they cannot probe which IDs exist.
6. Keep the existing code style and the existing CSS/theme. Reuse existing components
   (Modal, ConfirmModal, StatCard, DashboardLayout, api.ts) where they fit.
7. At the end, list every file you created, changed, or deleted, and how to test the change.
```

---

## Locked design (context for every task)

### People and roles

There are two separate kinds of accounts, stored in two separate tables:

- **Staff** (table `users`): roles `ADMIN`, `LEAD`, `EMPLOYEE`.
  - Every EMPLOYEE reports to exactly one LEAD (`lead_id`). ADMIN and LEAD have `lead_id = NULL`.
  - Staff accounts are created only by an ADMIN. There is no public staff registration.
- **Customer** (table `customers`): can self-register, browse products, book orders, and chat about an order.

JWTs carry a `typ` claim: `"staff"` or `"customer"`. A customer token must never work on staff endpoints, and a staff token must never work on customer endpoints.

### Entry page

The entry page has 3 buttons: **Admin**, **Employee**, **Customer**.

- Admin and Employee both open the same **staff login** page. The role comes from the database after login, never from which button was clicked.
- Customer opens the customer portal (login/register → products).

### Staff pages and permissions

| Page | ADMIN | LEAD | EMPLOYEE |
|---|---|---|---|
| Announcements | Create, edit, delete, view | View | View |
| Dashboard | Company-wide stats | Own team's stats | Own stats |
| Employee details | Create, edit, delete anyone | View + edit self (safe fields), view own team with employee count | View + edit self (safe fields) |
| Support (chat) | View all tickets and chats (read-only) | Assign unassigned tickets to own employees, view team's tickets, chat | Chat on tickets assigned to them |
| Deals | Unchanged from current code | Unchanged | Unchanged |
| Customer management | All customers | Customers whose tickets are assigned to own team | Customers whose tickets are assigned to them |

Customers cannot see announcements or any staff page.

"Safe fields" a staff member may edit on themselves: `name`, `phone`, `profile` (short bio). Only an ADMIN can change `email`, `role`, `lead_id`, `is_active`, or passwords of others.

### Ticket (support) flow

1. A customer raises an issue on one of **their own** orders → ticket created, status `OPEN`, no employee assigned.
2. All `OPEN` unassigned tickets appear in an **Unassigned** list visible to every LEAD and the ADMIN.
3. A LEAD assigns the ticket to one of **their own** employees → status `IN_PROGRESS`, `assigned_by` = that lead.
   - The assignment only succeeds if the ticket is still unassigned (prevents two leads grabbing it at once).
4. Customer and employee chat in real time (WebSocket). The employee's lead can also read and write. The ADMIN can read only.
5. The assigned employee (or their lead) marks it `RESOLVED`. A resolved ticket's chat becomes read-only.

Who can access a ticket (one shared function, `can_access_ticket`):

- the customer who owns it,
- the assigned employee,
- the LEAD of the assigned employee,
- any LEAD while the ticket is still unassigned (to decide on assignment),
- the ADMIN (read-only).

### Data model

| Table | Fields |
|---|---|
| `users` (staff) | id, name, email (unique), phone, profile, hashed_password, role (ADMIN/LEAD/EMPLOYEE), lead_id (FK users.id, nullable), is_active, created_at |
| `customers` | id, name, email (unique), phone, hashed_password, created_at |
| `products` | id, name, description, price, image_url |
| `orders` | id, customer_id, product_id, quantity, status (PLACED/SHIPPED/DELIVERED/CANCELLED), created_at |
| `tickets` | id, order_id, customer_id, subject, status (OPEN/IN_PROGRESS/RESOLVED), assigned_employee_id (nullable), assigned_by_id (nullable), created_at, updated_at |
| `messages` | id, ticket_id, sender_type (CUSTOMER/STAFF), sender_id, content, created_at |
| `announcements` | id, title, content, author_id (FK users.id), created_at, updated_at |
| `deals` | unchanged, except `contact_id` becomes an optional `customer_id` (FK customers.id, nullable) |

**Removed:** the old `leads` (sales prospects), `contacts`, `tasks`, and `notes` tables, plus their routers, schemas, and pages.

Products are a fixed catalog loaded by the seed script. There is no product-management page.

### Seed accounts (development only)

All passwords: `Password@123` (dev only, never used in production).

| Name | Email | Role | Reports to |
|---|---|---|---|
| Admin | admin@crm.test | ADMIN | — |
| Anita | anita@crm.test | LEAD | — |
| Vikram | vikram@crm.test | LEAD | — |
| Ravi | ravi@crm.test | EMPLOYEE | Anita |
| Meena | meena@crm.test | EMPLOYEE | Anita |
| Arjun | arjun@crm.test | EMPLOYEE | Vikram |
| Kavya | kavya@crm.test | EMPLOYEE | Vikram |
| Priya | priya@shop.test | Customer | — |
| Rahul | rahul@shop.test | Customer | — |

These names are used in the "Done when" checks below.

---

## Phase 0 – Safety and cleanup

### [x] Task 0.1 – Move secrets out of the code

**Before starting, do this yourself (not the AI):** rotate the Supabase database password in the Supabase dashboard. The old one is public in git history.

**Goal:** no secret is hardcoded anywhere.

What to do:

- `backend/app/database/connection.py`: read `DATABASE_URL` from the environment (load `backend/.env` with python-dotenv). Fail with a clear error if it is missing.
- `backend/app/auth/jwt_handler.py`: read `SECRET_KEY` from the environment and fail if it is missing (remove the `"your-secret-key"` fallback).
- Remove the hardcoded `INTERNAL_API_KEY = "crm-internal-ai-agent-key"` from the backend and the ai-agent.
- `backend/app/main.py`: replace `allow_origins=["*"]` with a list read from `FRONTEND_ORIGINS` (default `http://localhost:5173`).
- `.gitignore`: add `*.db`, `.env`, `**/.env`, `google_credentials.json`.
- Remove `backend/crm.db` and `backend/sql_app.db` from git (`git rm --cached`).
- Update `backend/.env.example` with `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_ORIGINS` placeholders.

Done when:

- `git grep -n "supabase.com"` and `git grep -n "crm-internal"` return nothing.
- The backend starts using your local `.env`.

### [x] Task 0.2 – Development database reset script

**Goal:** since the schema is changing a lot, create a clean reset instead of `ALTER TABLE` hacks.

What to do:

- Remove the `ALTER TABLE ...` block from `backend/app/main.py`. Keep `Base.metadata.create_all`.
- Create `backend/scripts/reset_db.py` that drops all tables and recreates them from the models. It must refuse to run unless the environment variable `ALLOW_DB_RESET=true` is set.

Done when:

- `ALLOW_DB_RESET=true python -m scripts.reset_db` (run from `backend/`) recreates empty tables.
- Running it without the variable prints a refusal and does nothing.

---

## Phase 1 – Remove what's no longer needed

### [x] Task 1.1 – Remove old Leads, Contacts, Tasks, Notes

What to do:

- **Backend:** delete the models, schemas, and routers for Lead (sales prospect), Contact, Task, and Note, including the `/leads/agent` endpoints. Remove their imports and `include_router` calls from `main.py`. Remove relationships to them from `User` and `Deal`. In `Deal`, remove `contact_id` and the `contact` relationship (the customer link is added in Task 5.5).
- **Frontend:** delete `LeadsPage`, `ContactsPage`, `TasksPage`, `LeadCard`, their routes in `App.tsx`, and their links in `Sidebar.tsx`.
- Remove any API calls to these routes from `DashboardPage` (show placeholders for now).
- **Docs:** remove these endpoints from `docs/` collections if present.

Done when:

- The backend starts with no import errors.
- The frontend builds (`npm run build`), and the Deals page still works.

### [x] Task 1.2 – Temporarily disable the AI chat

The AI agent will come back later as a support assistant. For now, turn it off so it can't bypass permissions.

What to do:

- Unregister the `ai` and `oauth` routers in `main.py`. Do not delete the `ai-agent/` folder.
- Hide the `ChatDrawer` in the frontend (don't render it; keep the file).

Done when:

- `POST /ai/chat` returns 404.
- The frontend builds and shows no chat drawer.

---

## Phase 2 – Staff model and staff auth

### [x] Task 2.1 – Staff roles and team structure

What to do:

- `User` model: roles become `ADMIN`, `LEAD`, `EMPLOYEE` (default `EMPLOYEE`). Add `phone`, `profile`, and `lead_id` (self-FK, nullable). Add relationships `lead` (many-to-one) and `team_members` (one-to-many).
- Remove `username` (login is by email only).
- `auth/dependencies.py`: replace the old role names everywhere. Provide `require_admin`, `require_lead_or_admin`, and `get_current_staff`.
- Replace every `SALESPERSON` with `EMPLOYEE` and every `MANAGER` with `LEAD` across the backend and frontend (including the Deals router).
- Validation: an EMPLOYEE must have a `lead_id` pointing to a user whose role is `LEAD`. ADMIN and LEAD must have `lead_id = NULL`.

Done when:

- `git grep -n -i "salesperson\|manager"` shows no role usages left.

### [x] Task 2.2 – Staff login with token type

What to do:

- Delete the public `POST /register` endpoint and `RegisterPage` (staff are created only by an admin in Task 5.1).
- Rename login to `POST /staff/login` (email + password). The JWT includes `sub` = the user **id**, `typ` = `"staff"`, and `role`.
- `get_current_staff`: decode the token, reject it unless `typ == "staff"`, load the user by id, and reject inactive users.
- Add `GET /staff/me` (replaces `/auth/me`).
- Update the frontend login and `AuthContext` to use these routes.

Done when:

- Anita can log in, and `/staff/me` returns her with role `LEAD`.
- An inactive user cannot log in.

### [x] Task 2.3 – Seed script

What to do:

- Rewrite `backend/scripts/seed_db.py` to create the seed accounts from the table above: 1 admin, 2 leads, 4 employees, 2 customers (the customers part runs after Task 3.1 exists, so write it so it can be re-run safely).
- Add about 8 products with names, prices, and descriptions.
- Add a few orders for Priya and Rahul.
- Make it safe to run twice (skip anything that already exists).

Done when:

- After reset + seed, all 7 staff accounts can log in.

---

## Phase 3 – Customers, products, orders

### [x] Task 3.1 – Customer accounts and customer auth

What to do:

- `Customer` model and schemas.
- `POST /customer/register`, `POST /customer/login`, `GET /customer/me`. The JWT uses `typ` = `"customer"`.
- `get_current_customer` dependency: reject unless `typ == "customer"`.
- Make `get_current_staff` reject customer tokens (it should already, because of the `typ` check).

Done when:

- Priya's token on `GET /staff/me` → 401.
- Anita's token on `GET /customer/me` → 401.

### [x] Task 3.2 – Products and orders

What to do:

- `Product` and `Order` models and schemas.
- `GET /products` (public, no login needed) and `GET /products/{id}`.
- `POST /orders` (customer only): the body has `product_id` and `quantity`. `customer_id` comes from the token, never from the body.
- `GET /orders/me` (customer only): only the logged-in customer's orders.

Done when:

- Priya only ever sees her own orders.
- Sending `customer_id` in the body is ignored.

---

## Phase 4 – Tickets and chat (the main feature)

### [x] Task 4.1 – Tickets and messages (REST)

What to do:

- `Ticket` and `Message` models and schemas.
- One shared function `can_access_ticket(actor, ticket) -> "write" | "read" | None` implementing the access rules in the Locked design section. Every ticket and message endpoint uses it.

Customer endpoints:

- `POST /customer/tickets` (body: `order_id`, `subject`, first message). The order must belong to this customer, otherwise 404.
- `GET /customer/tickets` lists their tickets.

Staff endpoints:

- `GET /tickets`, scoped by role:
  - ADMIN: all.
  - LEAD: team's tickets plus all unassigned.
  - EMPLOYEE: assigned to them.
  - Supports `?status=` and `?unassigned=true` filters.
- `POST /tickets/{id}/assign` (LEAD only), body `employee_id`.
  - The employee must be in this lead's team.
  - The ticket must still be unassigned. Use a single `UPDATE ... WHERE assigned_employee_id IS NULL` and check the affected row count, so two leads can't both assign it.
  - Sets `IN_PROGRESS` and `assigned_by_id`.
- `POST /tickets/{id}/resolve`: the assigned employee or their lead only.

Shared endpoints:

- `GET /tickets/{id}/messages` for anyone with read access.
- `POST /tickets/{id}/messages` for anyone with write access, and only if the ticket isn't `RESOLVED`.

Done when (dry run):

1. Priya opens a ticket on her order.
2. Anita and Vikram both see it as unassigned. Ravi does not see it.
3. Anita assigns it to Ravi → success.
4. Vikram then tries to assign it to Arjun → fails (already assigned).
5. Anita trying to assign one of Vikram's employees → fails.
6. Ravi and Priya can post messages. Meena gets 404. Admin can read but posting fails.
7. After Ravi resolves it, nobody can post.

### [x] Task 4.2 – Real-time chat with WebSocket

Keep it simple: an in-memory connection manager, no Redis.

What to do:

- Endpoint `WS /ws/tickets/{ticket_id}?token=<jwt>`.
- On connect:
  - Decode the token (staff or customer) and load the actor.
  - Run `can_access_ticket`. If no access, close with code 4403.
  - Register the socket under that ticket id.
- On an incoming message:
  - Require write access and a ticket that isn't `RESOLVED`.
  - Save the message to the DB **first**, then broadcast the saved message (with id and timestamp) to all sockets on that ticket.
- On disconnect: remove the socket.
- The REST `GET /tickets/{id}/messages` is still used to load history when a chat opens.

Done when:

- Two browser tabs (Priya and Ravi) on the same ticket see each other's messages instantly.
- Meena's socket is closed on connect.

---

## Phase 5 – Staff features (backend)

### [x] Task 5.1 – Employee details API

Endpoints:

- `GET /staff`:
  - ADMIN: all staff.
  - LEAD: self plus own team.
  - EMPLOYEE: only self.
  - Each LEAD in the response includes `team_count`.
- `GET /staff/{id}`: same scope, 404 outside it.
- `PATCH /staff/me`: a schema containing **only** `name`, `phone`, `profile`. Any other field is ignored.
- `POST /staff` (ADMIN): create staff with role and lead_id, using the validation from Task 2.1.
- `PATCH /staff/{id}` (ADMIN): may change any field.
- `DELETE /staff/{id}` (ADMIN):
  - Cannot delete self.
  - Cannot delete a LEAD who still has employees (return a clear error saying to move them first).
  - Cannot delete an EMPLOYEE with `IN_PROGRESS` tickets (same idea).

Done when:

- Ravi's `PATCH /staff/me` with `{"role": "ADMIN"}` leaves his role as EMPLOYEE.
- Anita's `GET /staff` shows herself, Ravi, and Meena, with `team_count` = 2.

### [x] Task 5.2 – Announcements API

Endpoints:

- `GET /announcements`: any staff, newest first.
- `POST`, `PUT /{id}`, and `DELETE /{id}`: ADMIN only.

Done when:

- A customer token gets 401.
- A LEAD posting gets 403.

### [x] Task 5.3 – Customer management API

Endpoints:

- `GET /customers`, scoped:
  - ADMIN: all customers.
  - LEAD: customers having at least one ticket assigned to their team.
  - EMPLOYEE: customers having at least one ticket assigned to them.
- `GET /customers/{id}`: returns the customer's contact details, orders, and tickets. It returns 404 if the customer is outside the caller's scope.

Done when:

- Ravi sees Priya once her ticket is assigned to him.
- Arjun gets 404 for Priya.

### [x] Task 5.4 – Dashboard stats API

`GET /dashboard`, scoped by role. Return counts only:

- **ADMIN:** total staff, leads, employees, customers, orders, and tickets by status.
- **LEAD:** team size, team tickets by status, unassigned ticket count.
- **EMPLOYEE:** my tickets by status.

Done when:

- The numbers match the seed data for each role.

### [x] Task 5.5 – Deals: role names and customer link

What to do:

- Keep all current Deals behaviour.
- Add an optional `customer_id` (FK customers.id, nullable) to `Deal` and its schemas.
- Make sure role checks use the new role names.

Done when:

- The Deals page works as before, and creating a deal without a customer still works.

---

## Phase 6 – Frontend

### [x] Task 6.1 – Entry page and routing

What to do:

- Replace `RoleSelectorPage` with an entry page that has 3 buttons: Admin, Employee, Customer.
  - Admin and Employee both go to `/staff/login`.
  - Customer goes to `/shop`.
- Split routing into two areas:
  - `/staff/*`: protected by the staff token, uses `DashboardLayout`.
  - `/shop/*`: customer portal, with its own simple layout.
- Keep the staff and customer tokens under different localStorage keys, with separate auth contexts (`StaffAuthContext`, `CustomerAuthContext`).

Done when:

- Visiting a staff page while logged in only as a customer redirects to the staff login.

### [x] Task 6.2 – Staff sidebar

Links: Announcements, Dashboard, Employee Details, Support, Deals, Customers. Every role sees all six pages. What they can *do* on each page differs, following the permission table.

### [x] Task 6.3 – Announcements page

- All staff see the list.
- The ADMIN also sees Create, Edit, and Delete (using `Modal` and `ConfirmModal`).

### [x] Task 6.4 – Employee Details page

- **ADMIN:** a table of all staff with Create, Edit, and Delete. The create/edit form has role and lead dropdowns (the lead dropdown only appears when the role is EMPLOYEE).
- **LEAD:** own profile card (editable safe fields) plus a "My team (N)" table.
- **EMPLOYEE:** own profile card with editable safe fields.

### [x] Task 6.5 – Reusable chat component

`TicketChat` component, used by both portals:

- Props: ticket id, token, and whether it is read-only.
- Loads history via REST, then connects the WebSocket.
- Shows messages with the sender name and time.
- Disables the input box when the ticket is resolved or the view is read-only.
- Reconnects automatically if the socket drops.

### [x] Task 6.6 – Customer portal

- `/shop`: product grid (anyone can browse).
- `/shop/login` and `/shop/register`.
- Product → "Book" (quantity) → creates an order (requires login).
- `/shop/orders`: my orders, each with a "Need help?" button that opens a new ticket.
- `/shop/tickets`: my tickets with status; clicking one opens `TicketChat`.

### [x] Task 6.7 – Staff Support page

- Tabs:
  - **Unassigned:** LEAD and ADMIN only.
  - **In progress.**
  - **Resolved.**
- **LEAD:** on an unassigned ticket, an "Assign to" dropdown listing only their own team.
- Clicking a ticket opens `TicketChat`:
  - read-only for the ADMIN,
  - a "Mark resolved" button for the assigned employee and their lead.

### [x] Task 6.8 – Customer Management page

- A table of customers in scope.
- Clicking one shows their details, orders, and tickets, with a link that opens a ticket in the Support page.

### [x] Task 6.9 – Dashboard page

- Show `StatCard`s from `GET /dashboard`, depending on role.
- For a LEAD, the unassigned count links to the Unassigned tab.

---

## Phase 7 – Wrap-up

### [x] Task 7.1 – Full dry run and docs

What to do:

- Reset + seed, then walk through the full ticket flow in the browser: Priya → Anita → Ravi → resolved.
- Rewrite the project `README.md` to describe the new design (you can copy the Locked design section).
- Update the Postman/Insomnia collections in `docs/` to the new endpoints.

---

## Phase 8 – Customer side completion

Decisions (locked):

- **Booking:** direct "Book now" (quantity + confirm). No cart and no online payment; show "Pay on delivery".
- **Order status:** `PLACED → SHIPPED → DELIVERED`, or `PLACED → CANCELLED`.
  - Staff may change the status of an order only if that order has a ticket they can write to (the assigned employee, that employee's lead) – or if they are the ADMIN.
  - The customer may cancel their own order only while it is `PLACED`.
- **One open ticket per order:** while an order has a ticket that is not `RESOLVED`, a new ticket on it is refused, and the UI shows "View conversation" instead of "Need help?".
- **Issue category** is required when opening a ticket: `DAMAGED`, `LATE_DELIVERY`, `WRONG_ITEM`, `CANCEL_REFUND`, `OTHER`. The subject becomes optional.
- **Staff privacy:** a customer only ever sees the helping staff member's **first name**, never their email, phone, or role.
- **My account:** a customer can edit their name and phone and change their password. Email is fixed.
- **Rating:** after a ticket is resolved, the customer can rate it 1–5 stars, once.

Schema changes in this phase (`tickets.category`, `tickets.rating`) → run reset + seed after Tasks 8.3 and 8.6.

### [x] Task 8.0 – Fix customer login (token interceptor bug)

**Bug:** `frontend/src/services/api.ts` attaches `staff_token` to *every* request and overwrites the customer token that pages pass explicitly. If a staff member has logged in on the same browser, `/customer/me` receives a staff token → 401 → the customer is logged out immediately.

What to do:

- In the request interceptor, attach `staff_token` only if the request does not already have an `Authorization` header.
- In the response interceptor, remove the line that deletes the old `token` key.
- `RegisterPage.tsx`: remove the unused import of `../context/AuthContext` (that file no longer exists).

Done when:

- Log in as a staff member, then (same browser, other tab) register and log in as a new customer. The customer reaches `/shop/orders`, and both sessions keep working.

### [x] Task 8.1 – Input validation

Backend (Pydantic, with `Field` constraints):

- `OrderCreate.quantity`: 1–10.
- Customer register: `name` 1–80 chars, `phone` max 20, `password` min 8.
- Ticket: `subject` max 120 (optional after 8.3), first message 1–2000.
- Chat messages (REST and WebSocket): content 1–2000 after trimming whitespace.

Frontend:

- Mirror these limits on the inputs (`min`, `max`, `maxLength`) so users see errors early. The backend check is still the real one.

Done when:

- `POST /orders` with `quantity: 0`, `-5`, or `1000` → 422.
- An empty or whitespace-only chat message is rejected, over both REST and WebSocket.

### [x] Task 8.2 – Order status lifecycle

Backend:

- `PATCH /orders/{id}/status` (staff). Body: `status`.
  - Allowed transitions only: `PLACED→SHIPPED`, `SHIPPED→DELIVERED`, `PLACED→CANCELLED`. Anything else → 400.
  - Permission: ADMIN, or a staff member with **write** access (via `can_access_ticket`) to at least one ticket on this order. Otherwise → 404.
- `POST /orders/{id}/cancel` (customer). Only for their own order (else 404), and only while it is `PLACED` (else 400).

Frontend:

- Customer Management → order rows get a status dropdown showing only the valid next statuses.
- The customer's "My orders" page shows the status and, while `PLACED`, a "Cancel order" button with `ConfirmModal`.

Done when (dry run):

1. With Priya's ticket assigned to Ravi, Ravi moves her order to `SHIPPED`.
2. Arjun gets 404 on the same order.
3. Priya cannot cancel it anymore (not `PLACED`).
4. Moving `DELIVERED → PLACED` → 400.

### [x] Task 8.3 – One open ticket per order + issue category

Backend:

- Add `category` to the `Ticket` model and schemas (the enum values above; required on create).
  - `subject` becomes optional. When empty, store the category's readable label ("Damaged item", etc.).
- `POST /customer/tickets`: if the order already has a ticket whose status is not `RESOLVED` → 409 with detail `"An open ticket already exists for this order"` and that ticket's id.
- `GET /orders/me`: include `open_ticket_id` (or null) for each order.

Frontend:

- Customer "My orders": if `open_ticket_id` is set, show "View conversation" (opens that ticket). Otherwise show "Need help?", which opens a form with the category dropdown, optional subject, and message.
- Staff Support page: show the category as a badge in every ticket list, especially Unassigned.

Done when:

- Priya's second "Need help?" on the same open order → 409, and the UI shows "View conversation" instead.
- After Ravi resolves the ticket, Priya can open a new one on that order.

### [x] Task 8.4 – What the customer sees about staff

Backend:

- Customer ticket responses include `agent_first_name` (the first word of the assigned employee's name, or null). No other staff fields.
- The message list and WebSocket payloads include `sender_name`:
  - the first name for staff,
  - the customer's name for the customer.
  - Computed on the server, never taken from the client.
- Customer-facing responses must not include `assigned_employee_id`, `assigned_by_id`, or staff `sender_id`. Use a separate `CustomerTicketResponse` schema.

Frontend:

- The customer ticket list shows "Ravi is helping you", or "Waiting for an agent" when unassigned.
- `TicketChat` shows `sender_name` on each message.

Done when:

- In the browser Network tab, no customer-side response contains a staff email or staff id.

### [x] Task 8.5 – Customer "My account"

Backend:

- `PATCH /customer/me`: only `name` and `phone` (same limits as 8.1). Any other field is ignored.
- `POST /customer/me/password`: body `current_password`, `new_password` (min 8).
  - A wrong current password → 400.

Frontend:

- A `/shop/account` page (protected) with a profile form and a change-password form.
- Add a link to it in `CustomerLayout`.

Done when:

- Priya changes her phone number.
- `PATCH /customer/me` with `{"email": "x@y.com"}` leaves her email unchanged.
- After a password change, the old password no longer logs in.

### [x] Task 8.6 – Rating after resolve

Backend:

- Add `rating` (int 1–5, nullable) and `rated_at` to `Ticket`.
- `POST /customer/tickets/{id}/rate`, body `rating`.
  - Own ticket only (else 404).
  - Only when `RESOLVED` (else 400).
  - Only once (else 409).
- `GET /dashboard` adds `avg_rating` and `rated_count`:
  - ADMIN: all tickets.
  - LEAD: their team's tickets.
  - EMPLOYEE: their own tickets.

Frontend:

- Resolved tickets in the customer portal show 1–5 stars until rated, then show the given rating.
- The staff dashboard shows an "Avg rating" `StatCard`.

Done when:

- Priya rates her resolved ticket 4.
- Rating it again → 409.
- Anita's dashboard shows an average of 4.0 from 1 rating.

### [x] Task 8.7 – Full customer dry run

Reset + seed, then in two browser windows (one normal, one incognito):

1. Priya registers, books 2 headphones, and opens a "Damaged item" ticket.
2. Anita assigns the ticket to Ravi.
3. Priya sees "Ravi is helping you".
4. Priya and Ravi chat live.
5. Ravi marks the order `SHIPPED`, then resolves the ticket.
6. Priya rates it.
7. Priya opens a new ticket on the same order – allowed, since the old one is resolved.

Fix anything that breaks, then update `README.md` with the customer-side flow.

---

## Phase 9 – Deployment (Vercel + Render + Supabase)

Target setup (locked):

| Part | Host | Why |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | Free static hosting with HTTPS. |
| Backend (FastAPI + WebSockets) | **Render** (Web Service) | Vercel's serverless functions cannot keep WebSocket connections open, so the backend must not go on Vercel. |
| Database | **Supabase Postgres** (unchanged) | Render's free disk is wiped on every restart/deploy, so a SQLite file on the server would lose all data. |

SQLite is **not** used on the server. Offline data lives in the user's browser (Phase 10).

### [x] Task 9.1 – Remove hardcoded localhost URLs

What to do:

- Frontend: create `frontend/src/config.ts` exporting:
  - `API_URL` = `import.meta.env.VITE_API_URL` (default `http://localhost:8000`),
  - `WS_URL` = `API_URL` with `http` → `ws` and `https` → `wss`.
- Use these in `services/api.ts` and `components/TicketChat.tsx` (both the history URL and the WebSocket URL). `TicketChat` should use the shared `api` instance instead of raw `axios`.
- `context/ChatContext.tsx`: the AI chat is disabled, so either remove this file or make it use `API_URL`.
- Add `frontend/.env.example` with `VITE_API_URL=http://localhost:8000`.
- Backend `routers/oauth.py`: it is unregistered – leave it, but read the redirect URI from an env variable instead of `localhost`.

Done when:

- `git grep -n "localhost:8000" frontend/src` only shows the default in `config.ts`.
- The app still works locally with no `.env` file.

### [x] Task 9.2 – Backend ready for Render

What to do:

- Pin versions in `backend/requirements.txt` (run `pip freeze` in a working venv and keep only the needed packages).
- Add `backend/render.yaml` (or document the dashboard settings in the README):
  - Root directory: `backend`
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add `GET /health` returning `{"status": "ok"}` (no database access) for Render's health check.
- `FRONTEND_ORIGINS` must accept a comma-separated list, trimmed of spaces (e.g. `http://localhost:5173,https://your-app.vercel.app`).
- Make sure the database URL is the Supabase **pooler** URL (Render has no IPv6, and Supabase's direct connection is IPv6-only).

Done when:

- Running the start command locally with `PORT=8000` works.
- `/health` responds without touching the DB.

### [x] Task 9.3 – Frontend ready for Vercel

What to do:

- Add `frontend/vercel.json` with a rewrite of all paths to `/index.html`, so refreshing `/staff/dashboard` or `/shop/orders` does not give a 404.
- Make sure `npm run build` passes with zero TypeScript errors (Vercel fails the deploy on any error).

Done when:

- `npm run build && npm run preview` works, and refreshing a deep link loads the page.

### [ ] Task 9.4 – Deploy (do this yourself, not the AI)

1. **Supabase:** confirm the password was rotated (Task 0.1). Copy the **Session pooler** connection string.
2. **Render:** New → Web Service → connect the GitHub repo → branch `redesign`, root `backend`. Environment variables:
   - `DATABASE_URL` = the pooler string,
   - `SECRET_KEY` = a new random value (`python -c "import secrets; print(secrets.token_urlsafe(48))"`), different from your local one,
   - `FRONTEND_ORIGINS` = filled in after step 3.
3. **Vercel:** New Project → same repo → root `frontend`, framework Vite. Environment variable `VITE_API_URL` = your Render URL (`https://<name>.onrender.com`, no trailing slash).
4. Go back to Render and set `FRONTEND_ORIGINS` = your Vercel URL. Redeploy.
5. **Seed once**, from your laptop: set `DATABASE_URL` in `backend/.env` to the Supabase pooler string and run `python -m scripts.seed_db`. Never run `reset_db` against the deployed database after the demo data is set up.

Done when (on the live URLs, two browsers):

- Staff login and customer login both work.
- Priya → Anita assigns → Ravi: live chat works (the WebSocket uses `wss://`).
- Refreshing any page works.

### Demo-day checklist

- Render's free tier **sleeps after ~15 minutes idle**, and the first request then takes about a minute. Open the backend `/health` URL 5 minutes before presenting.
- Supabase's free tier **pauses a project after about a week of no activity**. Log in to the Supabase dashboard a day before the demo to check it is active.
- If the venue has no internet, only pages each user opened earlier while online are visible (read-only), via Phase 10.

---

## Phase 10 – Offline read-only mode

Decisions (locked):

- When the network is down, users can **view** what they last saw: tickets, chat history, orders, customers, announcements, dashboard numbers.
- **Nothing can be changed offline:** Send, Assign, Resolve, Book, Cancel, Rate, and all edit/create/delete buttons are disabled, with a tooltip "Unavailable offline".
- No offline chat, no queued actions, no sync-back.
- Storage: browser **IndexedDB** via **Dexie.js** (the browser's local database; a normal SQLite file can't be used from a website).
- The app itself is cached by a **service worker** (`vite-plugin-pwa`), so the deployed site opens without internet after at least one online visit.

Cache limits:

| Data | Keep |
|---|---|
| Open / in-progress tickets | All, with the newest 200 messages each |
| Resolved tickets | Only from the last 14 days, max 30 |
| Announcements | Newest 20 |
| Orders | Newest 50 |
| Customers (staff only) | Only those linked to cached tickets |
| Dashboard stats | The latest response only |

Security rules:

- One cache per logged-in account (key includes `staff:<id>` or `customer:<id>`).
- Logout deletes that account's whole cache.
- A cache older than 7 days is deleted and not shown.
- Only responses the server returned to this user are cached – the cache never bypasses permissions.

### [x] Task 10.1 – Service worker (app loads offline)

- Add `vite-plugin-pwa` (a version compatible with this project's Vite version) with `registerType: 'autoUpdate'`.
- Precache the built app files (JS, CSS, HTML, icons) only.
- **Do not** let the service worker cache API responses or anything containing tokens – API data goes only into IndexedDB (Task 10.2).
- Add a minimal `manifest` (name, icons, theme colour).

Done when:

- On the deployed site: visit once online, turn the network off in DevTools (Network → Offline), reload – the app shell loads.

### [x] Task 10.2 – Local cache layer

- Add `dexie`. Create `frontend/src/offline/db.ts` with tables: `tickets`, `messages`, `orders`, `customers`, `announcements`, `meta` (for `owner_key`, `last_synced_at`, dashboard JSON).
- Create `frontend/src/offline/cache.ts` with:
  - `saveX(ownerKey, data)` / `loadX(ownerKey)` for each type,
  - `prune(ownerKey)` applying the limits table,
  - `clearOwner(ownerKey)`,
  - `isExpired(ownerKey)` (older than 7 days).
- Call `clearOwner` from both `logout` functions (staff and customer).

Done when:

- A unit-style check in the browser console: save 60 orders, prune, 50 remain.

### [x] Task 10.3 – Online/offline detection

Offline must be detected in **two** situations:

1. The browser has no network at all (`navigator.onLine` is false, or a request gets no response).
2. The browser can reach the backend, but the backend cannot reach Supabase. This is what happens when the backend runs on `localhost` and the Wi-Fi is off.

Backend:

- Add an exception handler in `main.py` for SQLAlchemy `OperationalError` (database unreachable) that returns **503** with `{"detail": "Database unavailable"}` instead of a 500 with a stack trace.

Frontend:

- Create `useOnlineStatus()`, based on `navigator.onLine` plus `online`/`offline` events.
- Treat a request as "offline" when it gets **no response**, or a **503**. Do NOT treat 401/403/404/400/500 as offline.
- While offline, retry `GET /health` every 15 seconds; when it and one real request succeed, switch back to online.
- A banner in both layouts: "You're offline – showing data from <time>".
- Export `isOffline` from a small context so pages can disable buttons.

Done when:

- With the backend running on localhost and Wi-Fi off, the banner appears (via the 503 path), not a blank page.

### [x] Task 10.4 – Pages read and write the cache

For each page (Announcements, Dashboard, Support + TicketChat, Customers, customer Orders, customer Tickets):

- **Online:** fetch from the API as now, then save the result into the cache and run `prune`.
- **Offline, or the request fails with no response:** load from the cache for the current owner key.
- If there is nothing cached: show "Not available offline yet – open this page once while online".
- `TicketChat` offline: show cached messages, hide the input box, and do not open a WebSocket. When the network returns: reconnect and reload history.
- Disable all action buttons while offline.

Done when (dry run on the deployed site):

1. Log in as Ravi, open Support and two tickets, open Customers.
2. DevTools → Network → Offline, then reload.
3. Ravi still sees his tickets and both chats; Send and Resolve are disabled.
4. Go back online: the banner disappears and new messages load.
5. Log out, log in as Meena while offline → she sees nothing of Ravi's.

### ~~Task 10.5 – Local fallback backend~~ (dropped – no SQLite)

Decision: SQLite is not used anywhere. Offline support is only the read-only browser cache (10.1–10.4).

---

## Phase 11 – Mobile app (Expo, React Native)

Branch: `mobile-app` (created from `redesign`). App folder: `mobile/` at the project root. The old `android/build.gradle` is deleted.

### Locked design

- **Same backend, no backend changes.** The app calls the same FastAPI endpoints as the website. Every permission is already enforced by the backend; the app only hides buttons, exactly like the website.
- **Expo Router** (file-based screens), **TypeScript**, **axios**, **expo-secure-store** for tokens (never AsyncStorage for tokens – it is not encrypted).
- **Two separate sessions**, like the website: `staff_token` and `customer_token` in SecureStore, each with its own auth context. A staff token is never sent to customer endpoints and vice versa.
- **Look:** the Orchid theme – same colour tokens as `theme-orchid.css` (light + dark follow the phone setting).
- **Runs in Expo Go** on a real phone on the same Wi-Fi as the laptop.

### Screens

| Group | Screens |
|---|---|
| Start | Welcome: "I'm staff" / "I'm a customer" |
| Staff (tabs) | Dashboard · Support (list → ticket chat) · Customers (list → detail) · Announcements · Profile |
| Customer (tabs) | Shop · My Orders · My Tickets (list → chat) · Account |

What changes by role (from `GET /staff/me` → `role`):

| | ADMIN | LEAD | EMPLOYEE |
|---|---|---|---|
| Support tabs | Unassigned · In progress · Resolved | Unassigned · In progress · Resolved | In progress · Resolved |
| In a ticket | Read-only chat | Chat, Assign (own team), Resolve | Chat, Resolve |
| Announcements | Create / edit / delete | Read | Read |
| Order status (Customers) | Change | Change (team tickets) | Change (own tickets) |

### Endpoints the app uses (already exist)

| Area | Endpoint |
|---|---|
| Staff auth | `POST /staff/login` `{email,password}` → `{access_token}` · `GET /staff/me` · `PATCH /staff/me` `{name,phone,profile}` |
| Customer auth | `POST /customer/register` `{name,email,password,phone}` · `POST /customer/login` · `GET /customer/me` · `PATCH /customer/me` · `POST /customer/me/password` |
| Dashboard | `GET /dashboard` |
| Tickets (staff) | `GET /tickets?status=&unassigned=` · `POST /tickets/{id}/assign` `{employee_id}` · `POST /tickets/{id}/resolve` · `GET /tickets/{id}/messages` · `GET /staff` (team list for Assign) |
| Tickets (customer) | `POST /customer/tickets` `{order_id,category,subject?,message}` · `GET /customer/tickets` · `GET /customer/tickets/{id}/messages` · `POST /customer/tickets/{id}/rate` `{rating}` |
| Live chat | `ws://<host>:8000/ws/tickets/{id}?token=<jwt>` – send plain text, receive JSON messages |
| Customers (staff) | `GET /customers` · `GET /customers/{id}` · `PATCH /orders/{id}/status` `{status}` |
| Shop | `GET /products` · `POST /orders` `{product_id,quantity}` · `GET /orders/me` · `POST /orders/{id}/cancel` |
| Announcements | `GET /announcements` · `POST /announcements` · `PUT /announcements/{id}` · `DELETE /announcements/{id}` |

### Rules for the AI agent (add to the usual rules)

```
- Work ONLY inside mobile/. Do not change backend/ or frontend/.
- Use Expo Router, TypeScript, axios, expo-secure-store. Install packages with
  "npx expo install <pkg>" (not npm install) so versions match the Expo SDK.
- Never hardcode the server address. Read it from process.env.EXPO_PUBLIC_API_URL.
- Store tokens only in expo-secure-store. Never log tokens.
- Every screen must handle: loading, empty list, and error (show a message, never a blank screen).
- Must run in Expo Go – do not add libraries that need native code outside the Expo SDK.
```

### Test accounts (from seed)

Staff: `admin@crm.test`, `anita@crm.test` (LEAD), `ravi@crm.test` (EMPLOYEE, Anita's team), `arjun@crm.test` (EMPLOYEE, Vikram's team). Customers: `priya@shop.test`, `rahul@shop.test`. Password for all: `Password@123`.

---

### [x] Task 11.0 – Setup

1. `git checkout redesign && git pull && git checkout -b mobile-app`
2. `git rm android/build.gradle`
3. `npx create-expo-app@latest mobile`, then `cd mobile && npm run reset-project` (answer **n**).
4. Start the backend so the phone can reach it: from `backend/`, `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
5. Find the laptop IP (`ipconfig` → IPv4, e.g. `192.168.1.5`). Allow Python through Windows Firewall when asked.
6. On the phone's browser open `http://192.168.1.5:8000/health` → must show `{"status":"ok"}`. If not, fix Wi-Fi/firewall before going further.
7. `npx expo start`, scan the QR in Expo Go → blank screen opens.

Done when: steps 6 and 7 both work.

### [x] Task 11.1 – API client, config and theme

- `mobile/.env` with `EXPO_PUBLIC_API_URL=http://192.168.1.5:8000` (and `.env.example` with a placeholder; add `.env` to `mobile/.gitignore`).
- `mobile/src/config.ts`: `API_URL` from the env var; `WS_URL` = same with `http→ws`, `https→wss`.
- `mobile/src/api/client.ts`: one axios instance, 10 s timeout. A helper `authHeader(token)`. A function `errorMessage(err)` that returns the backend's `detail` (string or first validation message), or "Can't reach the server – check Wi-Fi" when there is no response.
- `mobile/src/theme.ts`: Orchid colours for light and dark (copy the values from `frontend/src/styles/theme-orchid.css`), plus a `useTheme()` hook using `useColorScheme()`.
- Reusable components: `Screen` (safe area + background), `Card`, `Button` (primary gradient / outline / danger, with `loading` and `disabled`), `TextField`, `Badge`, `EmptyState`, `ErrorState`.

Done when: a temporary screen calls `GET /products` and shows the product count; turning the laptop's backend off shows the "Can't reach the server" message.

### [x] Task 11.2 – Auth: welcome, staff login, customer login/register

- `mobile/src/auth/StaffAuth.tsx` and `CustomerAuth.tsx`: contexts that load the token from SecureStore at start, call `/staff/me` or `/customer/me`, expose `user`, `login(token)`, `logout()`. Only a **401** logs the user out; a network error keeps the saved session.
- Screens: `app/index.tsx` (welcome, two big buttons), `app/staff/login.tsx`, `app/customer/login.tsx`, `app/customer/register.tsx`.
- Routing guard: opening a staff screen without a staff session redirects to staff login; same for customer.
- Staff profile tab shows name, email, role badge and **Log out**.

Done when:
- Anita logs in and sees role `LEAD`; closing and reopening Expo Go keeps her logged in.
- A wrong password shows the backend's error text.
- Priya can register a new account and log in.
- Logging in as staff does not log in the customer side (two separate sessions).

### [x] Task 11.3 – Staff tabs + Dashboard

- `app/staff/(tabs)/_layout.tsx` with tabs: Dashboard, Support, Customers, Announcements, Profile.
- Dashboard: `GET /dashboard`, show only the numbers that are present for this role (e.g. admin: staff, customers, orders; lead: team size, unassigned; everyone: tickets by status, average rating). Pull-to-refresh.

Done when: Admin, Anita and Ravi each see different cards, matching the website's dashboard.

### [x] Task 11.4 – Support list (staff)

- Segment control: **Unassigned** (LEAD/ADMIN only), **In progress**, **Resolved** → `GET /tickets?unassigned=true` / `?status=IN_PROGRESS` / `?status=RESOLVED`.
- Row: `#id`, subject, category badge, status badge, date. Tap → ticket screen. Pull-to-refresh.

Done when: Ravi sees no Unassigned tab and only his tickets; Anita sees Unassigned plus her team's tickets.

### [x] Task 11.5 – Live ticket chat (shared by staff and customer)

- `mobile/src/components/TicketChat.tsx` with props `ticketId`, `token`, `portal: 'staff' | 'customer'`, `readOnly`.
- Load history (`/tickets/{id}/messages` or `/customer/tickets/{id}/messages`), then open the WebSocket `WS_URL/ws/tickets/{id}?token=…`. Send = plain text; incoming = JSON message; ignore duplicates by `id`.
- Reconnect after 3 s if the socket closes, **except** close code 4403 (no access) → show "You don't have access to this ticket".
- Close the socket when the screen is left and when the app goes to the background (`AppState`); reconnect when it comes back.
- Bubbles: mine on the right (violet gradient), theirs on the left, sender name + time. Input hidden when `readOnly` or the ticket is RESOLVED. Keyboard must not cover the input (`KeyboardAvoidingView`).

Done when: website as Priya + phone as Ravi on the same ticket → messages appear on both within a second, in both directions.

### [x] Task 11.6 – Ticket actions (staff)

- Ticket screen header: status, category, order, customer name.
- **Assign** (LEAD, ticket unassigned): bottom sheet with the lead's own EMPLOYEEs from `GET /staff` → `POST /tickets/{id}/assign`.
- **Mark resolved** (assigned employee or their lead): confirm dialog → `POST /tickets/{id}/resolve`.
- ADMIN: chat is read-only, no action buttons.
- Show the backend error text if an action is refused.

Done when: Anita assigns a new ticket to Ravi from the phone; Ravi resolves it; Admin can read but has no input box.

### [x] Task 11.7 – Customers (staff)

- List `GET /customers` (name, email, phone), search box filters locally.
- Detail `GET /customers/{id}`: contact info, orders with status, tickets (tap → ticket screen).
- Order status change (only the valid next steps: PLACED→SHIPPED, SHIPPED→DELIVERED, PLACED→CANCELLED) → `PATCH /orders/{id}/status`.

Done when: Ravi sees Priya after her ticket is assigned to him and can mark her order SHIPPED; Arjun doesn't see Priya.

### [x] Task 11.8 – Announcements (staff)

- List `GET /announcements`, newest first.
- ADMIN only: "+" button → create form; long-press an item → Edit / Delete (with confirm).

Done when: admin posts from the phone and it appears on the website; Anita sees it but has no "+" button.

### [x] Task 11.9 – Customer tabs: Shop and Orders

- Tabs: Shop, My Orders, My Tickets, Account.
- Shop: product cards from `GET /products`; **Book** → quantity stepper 1–10 → `POST /orders` → success message.
- My Orders: `GET /orders/me` with status badges; **Cancel** (only PLACED, confirm) → `POST /orders/{id}/cancel`; **Need help?** → new-ticket form (category picker, optional subject, message) → `POST /customer/tickets`; if `open_ticket_id` is set show **View conversation** instead.

Done when: Priya books 2 items, cancels one, opens a "Damaged item" ticket on the other; a second "Need help?" on the same order is replaced by "View conversation".

### [x] Task 11.10 – Customer tickets, rating and account

- My Tickets: `GET /customer/tickets`, show "Ravi is helping you" / "Waiting for an agent". Tap → `TicketChat` (portal `customer`).
- Resolved and unrated → 1–5 stars → `POST /customer/tickets/{id}/rate`.
- Account: edit name/phone (`PATCH /customer/me`), change password (`POST /customer/me/password`), Log out.

Done when: Priya chats with Ravi, rates the resolved ticket 4, and the staff dashboard's average rating updates.

### [x] Task 11.11 – Polish and full dry run

- App name "Capstone CRM", icon and splash in Orchid colours (`app.json`).
- Every list: loading spinner, empty state, error state with **Retry**. Every action button shows a spinner and cannot be double-tapped.
- Two-device dry run: phone as Ravi, website as Priya (then swap) – full flow: book → ticket → Anita assigns → live chat → ship order → resolve → rate.
- Add a "Mobile app" section to `README.md`: how to run it (backend `--host 0.0.0.0`, `.env`, `npx expo start`, Expo Go).

Done when: the full flow works without touching the website for the staff side or the phone for the customer side.

### Later (mobile)

- Offline read-only cache like the website (store last responses per account).
- Push notifications for new messages (needs a development build, not Expo Go).
- Build an installable APK with EAS Build.

---

## Later (not now)

- The AI agent returns as a support assistant: it summarizes a ticket's chat or suggests a reply, and the employee approves before anything is sent.
- Escalation from employee to lead.
- Unread message badges.
- Cart and online payment for the shop.
- Audit log of admin actions.
- Alembic migrations instead of reset scripts.

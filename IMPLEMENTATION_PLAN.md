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

### [ ] Task 1.1 – Remove old Leads, Contacts, Tasks, Notes

What to do:

- **Backend:** delete the models, schemas, and routers for Lead (sales prospect), Contact, Task, and Note, including the `/leads/agent` endpoints. Remove their imports and `include_router` calls from `main.py`. Remove relationships to them from `User` and `Deal`. In `Deal`, remove `contact_id` and the `contact` relationship (the customer link is added in Task 5.5).
- **Frontend:** delete `LeadsPage`, `ContactsPage`, `TasksPage`, `LeadCard`, their routes in `App.tsx`, and their links in `Sidebar.tsx`.
- Remove any API calls to these routes from `DashboardPage` (show placeholders for now).
- **Docs:** remove these endpoints from `docs/` collections if present.

Done when:

- The backend starts with no import errors.
- The frontend builds (`npm run build`), and the Deals page still works.

### [ ] Task 1.2 – Temporarily disable the AI chat

The AI agent will come back later as a support assistant. For now, turn it off so it can't bypass permissions.

What to do:

- Unregister the `ai` and `oauth` routers in `main.py`. Do not delete the `ai-agent/` folder.
- Hide the `ChatDrawer` in the frontend (don't render it; keep the file).

Done when:

- `POST /ai/chat` returns 404.
- The frontend builds and shows no chat drawer.

---

## Phase 2 – Staff model and staff auth

### [ ] Task 2.1 – Staff roles and team structure

What to do:

- `User` model: roles become `ADMIN`, `LEAD`, `EMPLOYEE` (default `EMPLOYEE`). Add `phone`, `profile`, and `lead_id` (self-FK, nullable). Add relationships `lead` (many-to-one) and `team_members` (one-to-many).
- Remove `username` (login is by email only).
- `auth/dependencies.py`: replace the old role names everywhere. Provide `require_admin`, `require_lead_or_admin`, and `get_current_staff`.
- Replace every `SALESPERSON` with `EMPLOYEE` and every `MANAGER` with `LEAD` across the backend and frontend (including the Deals router).
- Validation: an EMPLOYEE must have a `lead_id` pointing to a user whose role is `LEAD`. ADMIN and LEAD must have `lead_id = NULL`.

Done when:

- `git grep -n -i "salesperson\|manager"` shows no role usages left.

### [ ] Task 2.2 – Staff login with token type

What to do:

- Delete the public `POST /register` endpoint and `RegisterPage` (staff are created only by an admin in Task 5.1).
- Rename login to `POST /staff/login` (email + password). The JWT includes `sub` = the user **id**, `typ` = `"staff"`, and `role`.
- `get_current_staff`: decode the token, reject it unless `typ == "staff"`, load the user by id, and reject inactive users.
- Add `GET /staff/me` (replaces `/auth/me`).
- Update the frontend login and `AuthContext` to use these routes.

Done when:

- Anita can log in, and `/staff/me` returns her with role `LEAD`.
- An inactive user cannot log in.

### [ ] Task 2.3 – Seed script

What to do:

- Rewrite `backend/scripts/seed_db.py` to create the seed accounts from the table above: 1 admin, 2 leads, 4 employees, 2 customers (the customers part runs after Task 3.1 exists, so write it so it can be re-run safely).
- Add about 8 products with names, prices, and descriptions.
- Add a few orders for Priya and Rahul.
- Make it safe to run twice (skip anything that already exists).

Done when:

- After reset + seed, all 7 staff accounts can log in.

---

## Phase 3 – Customers, products, orders

### [ ] Task 3.1 – Customer accounts and customer auth

What to do:

- `Customer` model and schemas.
- `POST /customer/register`, `POST /customer/login`, `GET /customer/me`. The JWT uses `typ` = `"customer"`.
- `get_current_customer` dependency: reject unless `typ == "customer"`.
- Make `get_current_staff` reject customer tokens (it should already, because of the `typ` check).

Done when:

- Priya's token on `GET /staff/me` → 401.
- Anita's token on `GET /customer/me` → 401.

### [ ] Task 3.2 – Products and orders

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

### [ ] Task 4.1 – Tickets and messages (REST)

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

### [ ] Task 4.2 – Real-time chat with WebSocket

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

### [ ] Task 5.1 – Employee details API

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

### [ ] Task 5.2 – Announcements API

Endpoints:

- `GET /announcements`: any staff, newest first.
- `POST`, `PUT /{id}`, and `DELETE /{id}`: ADMIN only.

Done when:

- A customer token gets 401.
- A LEAD posting gets 403.

### [ ] Task 5.3 – Customer management API

Endpoints:

- `GET /customers`, scoped:
  - ADMIN: all customers.
  - LEAD: customers having at least one ticket assigned to their team.
  - EMPLOYEE: customers having at least one ticket assigned to them.
- `GET /customers/{id}`: returns the customer's contact details, orders, and tickets. It returns 404 if the customer is outside the caller's scope.

Done when:

- Ravi sees Priya once her ticket is assigned to him.
- Arjun gets 404 for Priya.

### [ ] Task 5.4 – Dashboard stats API

`GET /dashboard`, scoped by role. Return counts only:

- **ADMIN:** total staff, leads, employees, customers, orders, and tickets by status.
- **LEAD:** team size, team tickets by status, unassigned ticket count.
- **EMPLOYEE:** my tickets by status.

Done when:

- The numbers match the seed data for each role.

### [ ] Task 5.5 – Deals: role names and customer link

What to do:

- Keep all current Deals behaviour.
- Add an optional `customer_id` (FK customers.id, nullable) to `Deal` and its schemas.
- Make sure role checks use the new role names.

Done when:

- The Deals page works as before, and creating a deal without a customer still works.

---

## Phase 6 – Frontend

### [ ] Task 6.1 – Entry page and routing

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

### [ ] Task 6.2 – Staff sidebar

Links: Announcements, Dashboard, Employee Details, Support, Deals, Customers. Every role sees all six pages. What they can *do* on each page differs, following the permission table.

### [ ] Task 6.3 – Announcements page

- All staff see the list.
- The ADMIN also sees Create, Edit, and Delete (using `Modal` and `ConfirmModal`).

### [ ] Task 6.4 – Employee Details page

- **ADMIN:** a table of all staff with Create, Edit, and Delete. The create/edit form has role and lead dropdowns (the lead dropdown only appears when the role is EMPLOYEE).
- **LEAD:** own profile card (editable safe fields) plus a "My team (N)" table.
- **EMPLOYEE:** own profile card with editable safe fields.

### [ ] Task 6.5 – Reusable chat component

`TicketChat` component, used by both portals:

- Props: ticket id, token, and whether it is read-only.
- Loads history via REST, then connects the WebSocket.
- Shows messages with the sender name and time.
- Disables the input box when the ticket is resolved or the view is read-only.
- Reconnects automatically if the socket drops.

### [ ] Task 6.6 – Customer portal

- `/shop`: product grid (anyone can browse).
- `/shop/login` and `/shop/register`.
- Product → "Book" (quantity) → creates an order (requires login).
- `/shop/orders`: my orders, each with a "Need help?" button that opens a new ticket.
- `/shop/tickets`: my tickets with status; clicking one opens `TicketChat`.

### [ ] Task 6.7 – Staff Support page

- Tabs:
  - **Unassigned:** LEAD and ADMIN only.
  - **In progress.**
  - **Resolved.**
- **LEAD:** on an unassigned ticket, an "Assign to" dropdown listing only their own team.
- Clicking a ticket opens `TicketChat`:
  - read-only for the ADMIN,
  - a "Mark resolved" button for the assigned employee and their lead.

### [ ] Task 6.8 – Customer Management page

- A table of customers in scope.
- Clicking one shows their details, orders, and tickets, with a link that opens a ticket in the Support page.

### [ ] Task 6.9 – Dashboard page

- Show `StatCard`s from `GET /dashboard`, depending on role.
- For a LEAD, the unassigned count links to the Unassigned tab.

---

## Phase 7 – Wrap-up

### [ ] Task 7.1 – Full dry run and docs

What to do:

- Reset + seed, then walk through the full ticket flow in the browser: Priya → Anita → Ravi → resolved.
- Rewrite the project `README.md` to describe the new design (you can copy the Locked design section).
- Update the Postman/Insomnia collections in `docs/` to the new endpoints.

---

## Later (not now)

- The AI agent returns as a support assistant: it summarizes a ticket's chat or suggests a reply, and the employee approves before anything is sent.
- Escalation from employee to lead.
- Unread message badges.
- Audit log of admin actions.
- Alembic migrations instead of reset scripts.

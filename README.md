# CRM Redesign

A dual-portal CRM built with FastAPI (backend) and React + Vite (frontend).

This CRM provides two completely distinct portals:
1. **Staff Portal**: An internal dashboard for employees, leads, and administrators to manage support tickets, announcements, deals, and customers.
2. **Customer Portal**: A public-facing shop where customers can browse and book products, view their orders, and communicate directly with staff through real-time support tickets.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, WebSockets
- **Frontend**: React, Vite, TypeScript, React Router, Tailwind-like custom CSS
- **Authentication**: JWT-based (distinct tokens for staff and customers)

## Features

### Role-Based Access Control
The application implements strict backend-enforced permissions across three staff roles:
- **ADMIN**: Global read/write access. Can create/edit/delete all staff members, view all tickets globally (read-only), manage all announcements, and view global CRM statistics.
- **LEAD**: Managers of employee teams. Can assign unassigned tickets to their own team members, view their team's tickets, manage their team's customers, and view team-level statistics.
- **EMPLOYEE**: Standard staff members. Can chat with customers on assigned tickets, resolve tickets, and view their own personal performance statistics.

### Real-Time Support Chat & Customer Flow
Built using WebSockets, customers and assigned staff can chat in real-time.
- **Customer Shopping & Orders**: Customers can register, browse available products, book orders, and manage their profile & password in their personal account page.
- **Support Tickets**: Customers can open support tickets (e.g. Damaged Item, Late Delivery, Cancellation) for their orders. Only one active ticket per order is permitted at a time.
- **Assignment & Privacy**: Unassigned tickets appear globally to all **LEADs**, who can assign them to their team members. Customer responses are strictly filtered server-side to omit internal staff IDs and emails (showing friendly agent display names such as *"Ravi is helping you"*).
- **Real-Time Messaging**: The chat features dynamic side-by-side bubbles, auto-scroll, and auto-reconnect logic over WebSockets.
- **Resolution & Star Rating**: Resolving a ticket permanently locks the chat to read-only mode for everyone. Customers can rate resolved tickets with 1–5 stars. Once resolved, customers are free to open a new ticket on the same order if needed.
- **Rating Analytics**: Staff dashboards automatically aggregate average ratings and total rated counts scoped by role (Admin sees global, Lead sees team, Employee sees personal).

## Local Development

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
```

Ensure your `.env` is configured (copy from `.env.example`). Then, reset and seed the database with test data:
```bash
python -m scripts.reset_db
python -m scripts.seed_db
```

Start the backend server:
```bash
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Test Accounts

The seed script creates the following default accounts (Password for all: `Password@123`):

**Staff**:
- `admin@crm.test` (ADMIN)
- `anita@crm.test` (LEAD)
- `vikram@crm.test` (LEAD)
- `ravi@crm.test` (EMPLOYEE reporting to Anita)

**Customers**:
- `priya@shop.test`
- `rahul@shop.test`

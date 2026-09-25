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

### Real-Time Support Chat
Built using WebSockets, customers and assigned staff can chat in real-time.
- Customers can raise a ticket for any of their orders.
- Unassigned tickets appear to all LEADs, who can assign them to their team members.
- The chat features dynamic side-by-side bubbles, auto-scroll, and auto-reconnect logic.
- Resolving a ticket permanently locks the chat to read-only mode for everyone.

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

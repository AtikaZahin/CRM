# 📋 Full CRM Project Documentation

This documentation covers the comprehensive structure, entities, functions, and workflows of the CRM project across its Backend, Frontend, Database, and MCP (Model Context Protocol) server.

---

## 🏗️ System Architecture

The CRM consists of a React-based frontend dashboard, a FastAPI python backend, an integrated AI agent via the `/ai/chat` endpoint, and an MCP server meant to facilitate AI tool calling. Data is persisted using SQLAlchemy models.

---

## 🗄️ Database & Entities (Backend Models)

The backend relies on SQLAlchemy for ORM mapping. The entities are stored in `backend/app/models/` and extend a common `Base`.

### 1. **User**
- **Purpose**: Represents system users (Salespersons, Managers, Admins).
- **Core Fields**: `id`, `name`, `email`, `password_hash`, `role`.
- **Relationships**: A User can be assigned `Leads`, `Deals`, `Tasks`, and create `Notes`.

### 2. **Lead**
- **Purpose**: Represents potential clients or prospects.
- **Core Fields**: `id`, `name`, `company`, `email`, `phone`, `status`.
- **Relationships**: Assigned to a `User`. Can have multiple `Notes`.

### 3. **Contact**
- **Purpose**: Represents established contacts/clients.
- **Core Fields**: `id`, `name`, `company`, `email`, `phone`.
- **Relationships**: Usually linked to `Deals`.

### 4. **Deal**
- **Purpose**: Represents an active sales opportunity.
- **Core Fields**: `id`, `title`, `amount`, `stage` (e.g., pipeline stage).
- **Relationships**: Linked to a `Contact` and assigned to a `User`.

### 5. **Task**
- **Purpose**: Represents an actionable item or reminder.
- **Core Fields**: `id`, `title`, `description`, `due_date`, `completed`.
- **Relationships**: Assigned to a `User`.

### 6. **Note**
- **Purpose**: Stores historical interactions or text remarks.
- **Core Fields**: `id`, `content`, `created_at`.
- **Relationships**: Linked to a `Lead` and created by a `User`.

---

## 🔌 Backend API Functions & Routes

The FastAPI backend exposes several routers for resource management located in `backend/app/routers/`:

### 🔐 Auth & OAuth (`auth.py`, `oauth.py`)
- `POST /auth/register`: Create a new user account.
- `POST /auth/login`: Authenticate and receive a JWT token.
- `GET /auth/me`: Get the currently logged-in user profile.
- `GET /auth/google/login` & `/auth/google/callback`: OAuth2 Google login flow.

### 👥 Users (`users.py`)
- `GET /users/`: List all users.
- `POST /users/`: Create a new user (admin context).
- `PUT /users/{user_id}`: Update user information.
- `DELETE /users/{user_id}`: Remove a user.

### 🎯 Leads (`leads.py`)
- `GET /leads/` & `GET /leads/{lead_id}`: Retrieve lead(s).
- `POST /leads/`: Create a new lead.
- `PUT /leads/{lead_id}`: Update lead status or details.
- `DELETE /leads/{lead_id}`: Remove a lead.
- **Agent Extensions**: `POST /leads/agent`, `GET /leads/agent`, `DELETE /leads/agent/{lead_id}` (Special endpoints for AI agent manipulation).

### 💼 Deals (`deals.py`)
- `GET /deals/` & `GET /deals/{deal_id}`: Retrieve deal(s).
- `POST /deals/`: Create a deal.
- `PUT /deals/{deal_id}`: Update a deal (e.g., change stage).
- `DELETE /deals/{deal_id}`: Delete a deal.

### 📇 Contacts (`contacts.py`)
- `GET /contacts/` & `GET /contacts/{contact_id}`: Retrieve contact(s).
- `POST /contacts/`: Add a new contact.
- `PUT /contacts/{contact_id}`: Edit contact info.
- `DELETE /contacts/{contact_id}`: Delete contact.

### 📝 Tasks (`tasks.py`)
- `GET /tasks/` & `GET /tasks/{task_id}`: Retrieve task(s).
- `POST /tasks/`: Create a new task.
- `PUT /tasks/{task_id}`: Update task status (e.g., mark as completed).
- `DELETE /tasks/{task_id}`: Delete a task.

### 🤖 AI Agent (`ai.py`)
- `POST /ai/chat`: Main entry point for natural language processing. The AI processes the prompt, determines the intent, and delegates to the MCP server.

---

## 🖥️ Frontend (React Dashboard)

Built with React, Vite, and TypeScript. Organized under `frontend/src/`:

### Key Pages
1. **`LoginPage.tsx`**: Handles user authentication, token retrieval, and role-based portal access (Salesperson, Manager, Admin).
2. **`DashboardPage.tsx`**: The main landing view showing overview metrics, stat cards, and recent CRM activity.
3. **`LeadsPage.tsx`**: Table and modal views for managing, filtering, and adding Leads.
4. **`ContactsPage.tsx`**: Address book view for all client Contacts.
5. **`DealsPage.tsx`**: A Kanban-style pipeline board for dragging and dropping Deals through various stages.
6. **`TasksPage.tsx`**: A to-do list manager for user-assigned Tasks.

### Core Structure
- **`/components`**: Reusable UI elements (`Navbar`, `Sidebar`, `LeadCard`, `StatCard`, etc.).
- **`/context`**: Global state management (e.g., `AuthContext`, `ThemeContext`).
- **`/services`**: Centralized API fetching logic (`api.ts`), integrating JWT interceptors for authenticated requests.
- **`/layouts`**: Wrappers for consistent page structures (`DashboardLayout.tsx`).
- **`/styles`**: Shared CSS modules or global styles.

---

## ⚙️ MCP Server (Model Context Protocol)

Located in `mcp-server/`. 
The MCP server acts as the secure intermediary layer allowing the AI Agent (via the Gemini API) to safely invoke backend functions. 

- **Entrypoint**: `mcp-server/server.py`
- **Current State**: The server infrastructure is instantiated (`main()` execution loop). 
- **Intended Workflow**: When the `POST /ai/chat` endpoint is hit on the backend, the AI generates tool-call payloads. The MCP Server executes these payloads as local tool functions (e.g., `add_lead`, `update_deal_stage`) which then interact with the database, ensuring the AI operates strictly within system permissions.

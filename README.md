# 📋 CRM Tool — AI-Powered, MCP-Driven

> A voice/text-driven CRM where a user types natural language on their **phone** (e.g., _"Add a new lead: Rahul from Infosys, phone 9876543210"_), and an **AI agent** interprets it, calls the right **MCP tools**, and updates the **database**. A **laptop web dashboard** provides full CRM data management.

---

## 🏗️ System Architecture

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  📱 Android  │────────▶│   ⚡ FastAPI     │◀────────│  💻 React    │
│  App (Chat)  │  REST   │   Backend        │  REST   │  Dashboard   │
└──────────────┘         └────────┬─────────┘         └──────────────┘
                                  │
                          ┌───────▼────────┐
                          │  🤖 AI Agent   │
                          │  (Gemini API)  │
                          └───────┬────────┘
                                  │
                          ┌───────▼────────┐
                          │  🔧 MCP Server │
                          │  (Tool Calls)  │
                          └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────────┐
              │ 🗄️ DB    │ │ 📧 Email │ │ 📅 Calendar  │
              │ SQLite/  │ │ Gmail    │ │ Google Cal   │
              │ Postgres │ │ API      │ │ API          │
              └──────────┘ └──────────┘ └──────────────┘
```

### How It Works (End to End)

```
User (Phone):  "Add a new lead - Rahul Sharma from Infosys, email rahul@infosys.com"
    → Android sends POST /ai/chat { message: "..." }
    → Backend forwards to AI Agent
    → Gemini parses intent → calls MCP tool "add_lead"
    → MCP tool calls POST /leads { name: "Rahul Sharma", company: "Infosys", ... }
    → Lead created in DB
    → Response: "✅ Lead added: Rahul Sharma (Infosys). Assigned to you."
    → Android shows response in chat bubble
    → Web dashboard auto-refreshes lead list
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | FastAPI (Python) | Fast, async, easy AI integration |
| **Database** | SQLite (dev) → PostgreSQL (prod) | Zero setup locally, scales later |
| **AI Model** | Gemini API (free tier) | Free, good function-calling support |
| **MCP Protocol** | Python MCP SDK | Official SDK, tool-calling standard |
| **Frontend** | React + TypeScript | Industry standard, component-based |
| **Mobile** | Android (Kotlin + Jetpack Compose) | Native performance |
| **Auth** | JWT tokens | Stateless, works across web + mobile |

### Free APIs Used

| Service | API | Use Case |
|---|---|---|
| **AI** | Gemini API (Google AI Studio) | Natural language → tool calls |
| **Email** | Gmail API (OAuth) or Mailgun free tier | Send follow-up emails |
| **Calendar** | Google Calendar API | Schedule meetings |

---

## 📁 Project Structure

```
CRM/
├── README.md
├── .gitignore
├── docker-compose.yml
├── docs/                       # Documentation
├── assets/                     # Images, icons, logos
│
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py             # App entrypoint with CORS
│   │   ├── config/
│   │   │   └── settings.py     # Env vars, DB URL
│   │   ├── database/
│   │   │   ├── connection.py   # SQLAlchemy engine + session
│   │   │   └── base.py         # Declarative base
│   │   ├── models/
│   │   │   ├── user.py         # User table
│   │   │   ├── lead.py         # Lead table
│   │   │   ├── contact.py      # Contact table
│   │   │   ├── deal.py         # Deal table
│   │   │   ├── task.py         # Task table
│   │   │   └── note.py         # Note table
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── auth.py         # /register, /login
│   │   │   ├── leads.py        # CRUD /leads
│   │   │   ├── contacts.py     # CRUD /contacts
│   │   │   ├── deals.py        # CRUD /deals
│   │   │   └── tasks.py        # CRUD /tasks
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Helpers
│   │   ├── middleware/         # Logging, error handling
│   │   └── auth/
│   │       ├── jwt_handler.py  # Create/verify tokens
│   │       └── dependencies.py # get_current_user
│   ├── requirements.txt
│   └── .env
│
├── frontend/                   # React + TypeScript
│   ├── public/
│   ├── src/
│   │   ├── App.tsx             # Routing setup
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LeadsPage.tsx
│   │   │   ├── ContactsPage.tsx
│   │   │   ├── DealsPage.tsx
│   │   │   └── TasksPage.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LeadCard.tsx
│   │   │   ├── DealPipelineBoard.tsx
│   │   │   └── StatCard.tsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── services/
│   │   │   └── api.ts          # Axios/fetch wrapper with JWT
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── assets/
│   └── package.json
│
├── android/                    # Android App (Kotlin)
│   ├── app/src/main/java/com/capstone/crm/
│   │   ├── MainActivity.kt
│   │   ├── ui/
│   │   │   ├── ChatScreen.kt
│   │   │   ├── LoginScreen.kt
│   │   │   └── components/
│   │   │       ├── MessageBubble.kt
│   │   │       └── InputBar.kt
│   │   ├── data/
│   │   │   ├── models/
│   │   │   └── local/TokenStore.kt
│   │   ├── network/
│   │   │   ├── ApiService.kt
│   │   │   └── RetrofitClient.kt
│   │   └── repository/
│   │       └── CrmRepository.kt
│   └── build.gradle
│
├── mcp-server/                 # MCP Server
│   ├── server.py               # MCP server entrypoint
│   ├── tools/
│   │   ├── lead_tools.py       # add_lead, update_lead, search_leads
│   │   ├── contact_tools.py    # add_contact, get_contact
│   │   ├── deal_tools.py       # create_deal, update_deal_stage
│   │   └── task_tools.py       # create_task, complete_task
│   ├── handlers/
│   │   └── tool_handler.py     # Routes tool calls → backend API
│   ├── prompts/
│   └── resources/
│
├── ai-agent/                   # AI Logic
│   ├── agent.py                # Main orchestrator
│   ├── gemini/
│   │   ├── client.py           # Gemini API wrapper
│   │   └── function_defs.py    # Tool definitions for Gemini
│   ├── prompts/
│   │   └── system_prompt.txt   # CRM assistant system prompt
│   ├── orchestrator/
│   │   └── intent_parser.py    # Parse user message → tool call
│   └── memory/                 # Conversation context
│
├── shared/                     # Shared constants/models
│   ├── constants/
│   ├── models/
│   └── types/
│
├── scripts/                    # Setup & utility scripts
│   └── seed_db.py              # Seed sample data
│
└── tests/
    ├── backend/
    ├── frontend/
    ├── mcp/
    └── android/
```

---

## 🗄️ Database Design

```
┌─────────────────┐       ┌─────────────────┐
│      USER       │       │      LEAD       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ name            │  │    │ name            │
│ email           │  │    │ company         │
│ password_hash   │  ├───▶│ email           │
│ role            │  │    │ phone           │
└─────────────────┘  │    │ status          │
                     │    │ assigned_to (FK)│──▶ USER
                     │    └────────┬────────┘
                     │             │
                     │    ┌────────▼────────┐
                     │    │      NOTE       │
                     │    ├─────────────────┤
                     │    │ id (PK)         │
                     │    │ content         │
                     │    │ created_at      │
                     │    │ lead_id (FK)    │──▶ LEAD
                     │    │ created_by (FK) │──▶ USER
                     │    └─────────────────┘
                     │
┌─────────────────┐  │    ┌─────────────────┐
│    CONTACT      │  │    │      DEAL       │
├─────────────────┤  │    ├─────────────────┤
│ id (PK)         │  │    │ id (PK)         │
│ name            │  │    │ title           │
│ company         │  │    │ amount          │
│ email           │  ├───▶│ stage           │
│ phone           │◀─┘    │ contact_id (FK) │──▶ CONTACT
└─────────────────┘       │ assigned_to(FK) │──▶ USER
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │    ACTIVITY     │
                          ├─────────────────┤
┌─────────────────┐       │ id (PK)         │
│      TASK       │       │ type            │
├─────────────────┤       │ description     │
│ id (PK)         │       │ timestamp       │
│ title           │       │ deal_id (FK)    │──▶ DEAL
│ description     │       └─────────────────┘
│ due_date        │
│ completed       │
│ assigned_to(FK) │──▶ USER
└─────────────────┘
```

---

## 👥 Team Assignments

| Person | Role | Primary Ownership |
|---|---|---|
| **Person 1** | Backend + DB Lead | FastAPI, database models, REST APIs, auth |
| **Person 2** | AI + MCP Lead | Gemini integration, MCP server, tool definitions |
| **Person 3** | Frontend (Web) Lead | React dashboard, API integration, UI/UX |
| **Person 4** | Android Lead | Android app, natural language input, API calls |

---

## 📅 Work Breakdown (In Order)

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHASE 0 — Setup & Agreements (Day 1–2)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> **⚠️ Do this TOGETHER before splitting up. Everyone must agree on API shapes.**

| # | Task | Owner | Status |
|---|---|---|---|
| 0.1 | Set up Git repo + branching strategy (`main` → `dev` → feature branches) | Everyone | ⬜ |
| 0.2 | Define and document API contract in `docs/api-contract.md` | Everyone | ⬜ |
| 0.3 | Set up shared Postman/Insomnia collection for API testing | Everyone | ✅ |
| 0.4 | Agree on dev environment (Python 3.11+, Node 18+, Android Studio) | Everyone | ⬜ |
| 0.5 | Create `.env.example` files for all services | Everyone | ⬜ |

**Deliverable:** Everyone can run their local dev environment + API contract is documented.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHASE 1 — Foundation (Day 3–7)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> **All 4 people work in PARALLEL. No cross-dependencies yet.**

---

#### 🔵 Person 1 — Backend Foundation

| # | Task | Files | Status |
|---|---|---|---|
| 1.1 | Set up SQLAlchemy with SQLite | `database/connection.py`, `database/base.py` | ⬜ |
| 1.2 | Create User model + migration | `models/user.py` | ⬜ |
| 1.3 | Create Lead model | `models/lead.py` | ⬜ |
| 1.4 | Create Contact model | `models/contact.py` | ⬜ |
| 1.5 | Create Deal model | `models/deal.py` | ⬜ |
| 1.6 | Create Task model | `models/task.py` | ⬜ |
| 1.7 | Create Note model | `models/note.py` | ⬜ |
| 1.8 | Create Pydantic schemas for all models | `schemas/*.py` | ⬜ |
| 1.9 | Implement JWT auth (register, login, token verify) | `auth/jwt_handler.py`, `auth/dependencies.py` | ⬜ |
| 1.10 | Build auth router (`/register`, `/login`) | `routers/auth.py` | ⬜ |
| 1.11 | Build Leads CRUD router | `routers/leads.py` | ⬜ |
| 1.12 | Build Contacts CRUD router | `routers/contacts.py` | ⬜ |
| 1.13 | Build Deals CRUD router | `routers/deals.py` | ⬜ |
| 1.14 | Build Tasks CRUD router | `routers/tasks.py` | ⬜ |
| 1.15 | Add CORS middleware | `main.py` | ⬜ |
| 1.16 | Write seed data script | `scripts/seed_db.py` | ⬜ |
| 1.17 | Test all endpoints via Postman | — | ⬜ |

**Deliverable:** All CRUD endpoints working + auth system complete.

---

#### 🟢 Person 2 — AI Agent + MCP Foundation

| # | Task | Files | Status |
|---|---|---|---|
| 2.1 | Get Gemini API key (Google AI Studio — free) | — | ⬜ |
| 2.2 | Set up Gemini API client | `ai-agent/gemini/client.py` | ⬜ |
| 2.3 | Write CRM system prompt | `ai-agent/prompts/system_prompt.txt` | ⬜ |
| 2.4 | Define tool/function schemas for Gemini | `ai-agent/gemini/function_defs.py` | ⬜ |
| 2.5 | Build intent parser (message → action) | `ai-agent/orchestrator/intent_parser.py` | ⬜ |
| 2.6 | Build main agent orchestrator | `ai-agent/agent.py` | ⬜ |
| 2.7 | Set up MCP server with tool registration | `mcp-server/server.py` | ⬜ |
| 2.8 | Implement Lead tools (add, update, search, delete) | `mcp-server/tools/lead_tools.py` | ⬜ |
| 2.9 | Implement Contact tools | `mcp-server/tools/contact_tools.py` | ⬜ |
| 2.10 | Implement Deal tools | `mcp-server/tools/deal_tools.py` | ⬜ |
| 2.11 | Implement Task tools | `mcp-server/tools/task_tools.py` | ⬜ |
| 2.12 | Build tool handler (routes MCP calls → backend API) | `mcp-server/handlers/tool_handler.py` | ⬜ |
| 2.13 | Test with mock data: "Add lead Rahul" → correct tool call | — | ⬜ |

**Deliverable:** AI agent can interpret natural language and call the correct MCP tool.

---

#### 🟡 Person 3 — React Dashboard Foundation

| # | Task | Files | Status |
|---|---|---|---|
| 3.1 | Set up Vite + React + TypeScript + React Router | `package.json`, `App.tsx` | ⬜ |
| 3.2 | Create Dashboard layout (sidebar + top nav) | `layouts/DashboardLayout.tsx` | ⬜ |
| 3.3 | Build Navbar component | `components/Navbar.tsx` | ⬜ |
| 3.4 | Build Sidebar component | `components/Sidebar.tsx` | ⬜ |
| 3.5 | Build Login page | `pages/LoginPage.tsx` | ⬜ |
| 3.6 | Build Auth context (JWT storage, protected routes) | `context/AuthContext.tsx` | ⬜ |
| 3.7 | Build API service layer (axios + JWT interceptor) | `services/api.ts` | ⬜ |
| 3.8 | Build Dashboard page (stat cards, overview) | `pages/DashboardPage.tsx`, `components/StatCard.tsx` | ⬜ |
| 3.9 | Build Leads page (table + add/edit modals) | `pages/LeadsPage.tsx`, `components/LeadCard.tsx` | ⬜ |
| 3.10 | Build Contacts page | `pages/ContactsPage.tsx` | ⬜ |
| 3.11 | Build Deals page (kanban/pipeline board) | `pages/DealsPage.tsx`, `components/DealPipelineBoard.tsx` | ⬜ |
| 3.12 | Build Tasks page | `pages/TasksPage.tsx` | ⬜ |
| 3.13 | Use mock data for all pages initially | — | ⬜ |

**Deliverable:** Full dashboard UI working with mock data.

---

#### 🟠 Person 4 — Android App Foundation

| # | Task | Files | Status |
|---|---|---|---|
| 4.1 | Set up Android project (Kotlin + Jetpack Compose) | `build.gradle`, `MainActivity.kt` | ⬜ |
| 4.2 | Build Login screen | `ui/LoginScreen.kt` | ⬜ |
| 4.3 | Implement JWT token storage | `data/local/TokenStore.kt` | ⬜ |
| 4.4 | Set up Retrofit for API calls | `network/RetrofitClient.kt`, `network/ApiService.kt` | ⬜ |
| 4.5 | Build Chat screen layout | `ui/ChatScreen.kt` | ⬜ |
| 4.6 | Build MessageBubble component | `ui/components/MessageBubble.kt` | ⬜ |
| 4.7 | Build InputBar component (text input + send button) | `ui/components/InputBar.kt` | ⬜ |
| 4.8 | Create data models (ChatMessage, Lead, etc.) | `data/models/*.kt` | ⬜ |
| 4.9 | Build CRM Repository (data layer) | `repository/CrmRepository.kt` | ⬜ |
| 4.10 | Test chat UI with hardcoded responses | — | ⬜ |

**Deliverable:** Android app with login + chat UI working with mock responses.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHASE 2 — Integration (Day 8–12)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> **⚠️ This is where things break. Test against REAL endpoints, not mocks.**

---

#### 🔵 Person 1 — Backend: AI Endpoint + Polish

| # | Task | Depends On | Status |
|---|---|---|---|
| 5.1 | Create `/ai/chat` POST endpoint (forwards to AI agent) | Person 2 ready | ⬜ |
| 5.2 | Add WebSocket support for real-time chat (optional) | — | ⬜ |
| 5.3 | Add activity logging middleware (track all CRM changes) | — | ⬜ |
| 5.4 | Add search/filter query params to all CRUD endpoints | — | ⬜ |
| 5.5 | Write backend unit tests | — | ⬜ |
| 5.6 | Write integration tests for AI chat flow | Person 2 ready | ⬜ |

---

#### 🟢 Person 2 — AI: End-to-End Tool Calling

| # | Task | Depends On | Status |
|---|---|---|---|
| 6.1 | Connect MCP tools to LIVE backend APIs (replace mocks) | Person 1 endpoints ready | ⬜ |
| 6.2 | Test: "Add lead Rahul from Infosys" → DB entry created | Task 6.1 | ⬜ |
| 6.3 | Test: "Show my deals in negotiation" → correct list returned | Task 6.1 | ⬜ |
| 6.4 | Add error handling (Gemini hallucinated tool, bad params, etc.) | — | ⬜ |
| 6.5 | Implement conversation memory (last 5 messages as context) | — | ⬜ |
| 6.6 | Add confirmation step for destructive actions (delete) | — | ⬜ |
| 6.7 | Test 10+ real user scenarios end to end | — | ⬜ |

---

#### 🟡 Person 3 — Frontend: Connect to Live API

| # | Task | Depends On | Status |
|---|---|---|---|
| 7.1 | Replace all mock data with real API calls | Person 1 endpoints ready | ⬜ |
| 7.2 | Wire up login page to `/auth/login` | Task 5.1 | ⬜ |
| 7.3 | Wire up Leads page CRUD to `/leads` | — | ⬜ |
| 7.4 | Wire up Contacts page CRUD | — | ⬜ |
| 7.5 | Wire up Deals page CRUD | — | ⬜ |
| 7.6 | Wire up Tasks page CRUD | — | ⬜ |
| 7.7 | Add search and filter UI | Task 5.4 | ⬜ |
| 7.8 | Add real-time updates (polling or WebSocket) | Task 5.2 | ⬜ |
| 7.9 | Add toast notifications for success/error | — | ⬜ |
| 7.10 | Add loading spinners and error states | — | ⬜ |

---

#### 🟠 Person 4 — Android: Connect to Live API

| # | Task | Depends On | Status |
|---|---|---|---|
| 8.1 | Point Retrofit to actual backend URL | Person 1 endpoints ready | ⬜ |
| 8.2 | Wire login screen to `/auth/login` | — | ⬜ |
| 8.3 | Send chat messages to `/ai/chat` endpoint | Task 5.1 | ⬜ |
| 8.4 | Display AI responses in chat bubbles | Task 6.1 | ⬜ |
| 8.5 | Add quick-action buttons ("Show my leads", "Today's tasks") | — | ⬜ |
| 8.6 | Handle network errors + retry logic | — | ⬜ |
| 8.7 | Handle offline state gracefully | — | ⬜ |
| 8.8 | Add push notifications for task reminders (optional) | — | ⬜ |

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHASE 3 — Polish & Demo (Day 13–16)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Task | Owner | Status |
|---|---|---|---|
| 9.1 | End-to-end testing across ALL platforms | Everyone | ⬜ |
| 9.2 | Fix critical bugs from integration | Everyone | ⬜ |
| 9.3 | Dashboard analytics (lead count, deal pipeline value, conversion %) | Person 3 | ⬜ |
| 9.4 | Add dark mode / UI polish to web dashboard | Person 3 | ⬜ |
| 9.5 | Polish Android chat UX (typing indicator, smooth scroll) | Person 4 | ⬜ |
| 9.6 | Add more AI scenarios (email, calendar integration) | Person 2 | ⬜ |
| 9.7 | Performance optimization (caching, lazy loading) | Person 1 | ⬜ |
| 9.8 | Write final README documentation | Everyone | ⬜ |
| 9.9 | Prepare demo script and presentation | Everyone | ⬜ |
| 9.10 | Record demo video | Everyone | ⬜ |

---

## 📡 API Contract

```
AUTH
  POST   /auth/register         { name, email, password }           → { id, token }
  POST   /auth/login             { email, password }                 → { token }

LEADS
  GET    /leads                  ?status=&search=&assigned_to=       → [Lead]
  POST   /leads                  { name, company, email, phone, status }
  GET    /leads/{id}                                                 → Lead
  PUT    /leads/{id}             { ...fields to update }
  DELETE /leads/{id}

CONTACTS
  GET    /contacts               ?search=                            → [Contact]
  POST   /contacts               { name, company, email, phone }
  GET    /contacts/{id}                                              → Contact
  PUT    /contacts/{id}          { ...fields to update }
  DELETE /contacts/{id}

DEALS
  GET    /deals                  ?stage=&contact_id=                 → [Deal]
  POST   /deals                  { title, amount, stage, contact_id }
  GET    /deals/{id}                                                 → Deal
  PUT    /deals/{id}             { ...fields to update }
  DELETE /deals/{id}

TASKS
  GET    /tasks                  ?completed=&assigned_to=            → [Task]
  POST   /tasks                  { title, description, due_date }
  GET    /tasks/{id}                                                 → Task
  PUT    /tasks/{id}             { ...fields to update }
  DELETE /tasks/{id}

AI CHAT
  POST   /ai/chat                { message, conversation_id }       → { response, actions_taken[] }
```

---

## 🔀 Git Branching Strategy

```
main ─────────────────────────────────── (production-ready releases)
  └── dev ────────────────────────────── (integration branch)
        ├── feature/backend-auth          (Person 1)
        ├── feature/backend-crud          (Person 1)
        ├── feature/ai-gemini-client      (Person 2)
        ├── feature/mcp-tools             (Person 2)
        ├── feature/frontend-auth         (Person 3)
        ├── feature/frontend-dashboard    (Person 3)
        ├── feature/android-auth          (Person 4)
        └── feature/android-chat          (Person 4)
```

**Rules:**
1. ❌ Never push directly to `main` or `dev`
2. ✅ Create PRs from feature branches → `dev`
3. ✅ At least 1 team member reviews before merge
4. ✅ Merge `dev` → `main` only when a phase is stable

---

## ⚠️ Dependency Order (Critical)

> Follow this order or team members will be **blocked** waiting on each other.

```
 Day 1-2:  EVERYONE does Phase 0 together (API contract)
              │
 Day 3-7:  All 4 work in PARALLEL on Phase 1
              │
              ├── Person 1 (Backend) must have auth + 1 CRUD endpoint by Day 5
              │     so Person 2/3/4 can start testing against real APIs
              │
              ├── Person 2 (AI) uses mock responses until backend is ready
              │
              ├── Person 3 (Frontend) uses mock data, swaps to real API in Phase 2
              │
              └── Person 4 (Android) uses hardcoded responses, swaps in Phase 2
              │
 Day 8-12: Phase 2 — Integration (everyone connects to live backend)
              │
              ├── Person 1 + Person 2 MUST coordinate on /ai/chat endpoint
              │
              └── Person 3 + Person 4 swap mocks for real API calls
              │
 Day 13-16: Phase 3 — Polish, test, demo prep
```

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd capstone

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# MCP Server
cd mcp-server
python server.py

# AI Agent
cd ai-agent
python agent.py
```

---

## 📝 Example AI Chat Scenarios

| User Says (Phone) | AI Does | MCP Tool Called |
|---|---|---|
| "Add a new lead - Rahul from Infosys, 9876543210" | Creates lead in DB | `add_lead` |
| "Show all my leads" | Fetches assigned leads | `search_leads` |
| "Move deal 'Enterprise Plan' to negotiation stage" | Updates deal stage | `update_deal_stage` |
| "Create a task: Follow up with Priya by Friday" | Creates task with due date | `create_task` |
| "What deals do I have in negotiation?" | Queries deals by stage | `search_deals` |
| "Delete the lead named Test Company" | Confirms, then deletes | `delete_lead` |
| "Add a note to lead Rahul: Had a great call today" | Adds note to lead | `add_note` |

---

## 📄 License

This project is part of our Capstone submission.

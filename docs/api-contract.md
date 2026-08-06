# 📡 CRM System API Contract & Collections Guide

## 1. Overview
This document defines the REST API contract for the AI-powered CRM system (FastAPI backend). It covers endpoints for user authentication, leads, contacts, deals, tasks, notes, and AI natural language chat commands.

---

## 2. Base URL & Shared Collections

- **Development Base URL**: `http://localhost:8000`
- **Postman Collection**: [`docs/crm-postman-collection.json`](file:///c:/Users/divya/Desktop/CRM/docs/crm-postman-collection.json)
- **Postman Environment**: [`docs/crm-postman-environment.json`](file:///c:/Users/divya/Desktop/CRM/docs/crm-postman-environment.json)
- **Insomnia Collection**: [`docs/crm-insomnia-collection.json`](file:///c:/Users/divya/Desktop/CRM/docs/crm-insomnia-collection.json)

### Importing into Postman
1. Open Postman -> Click **Import** (top left).
2. Select `docs/crm-postman-collection.json` and `docs/crm-postman-environment.json`.
3. Select the **CRM Local Environment** in the top-right environment selector.
4. When you call `POST /auth/login`, the test script automatically populates `{{authToken}}` in your collection environment!

### Importing into Insomnia
1. Open Insomnia -> Click **Create** / **Import From File**.
2. Select `docs/crm-insomnia-collection.json` or `docs/crm-postman-collection.json` (Insomnia natively supports both formats).

---

## 3. Authentication
- **Header Standard**: `Authorization: Bearer <JWT_TOKEN>`
- Unauthenticated requests to protected endpoints return `401 Unauthorized`.

---

## 4. Core Endpoints Specification

### 4.1 Authentication (`/auth`)

#### `POST /auth/register`
Create a new user account.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```

#### `POST /auth/login`
Authenticate existing user and obtain JWT token.
- **Request Body**:
  ```json
  {
    "email": "jane.doe@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane.doe@example.com"
    }
  }
  ```

---

### 4.2 Leads (`/leads`)

#### `GET /leads`
- **Query Parameters**:
  - `status`: Filter by status (`new`, `contacted`, `qualified`, `lost`)
  - `search`: String search across name, company, email
  - `assigned_to`: User ID integer
  - `limit`: Number of items (default: `10`)
  - `offset`: Offset integer (default: `0`)
- **Response**: `200 OK` (Array of Lead objects)

#### `POST /leads`
- **Request Body**:
  ```json
  {
    "name": "Rahul Sharma",
    "company": "Infosys",
    "email": "rahul@infosys.com",
    "phone": "+919876543210",
    "status": "new"
  }
  ```
- **Response**: `201 Created`

#### `GET /leads/{id}`
- **Response**: `200 OK` (Lead details) or `404 Not Found`

#### `PUT /leads/{id}`
- **Request Body**: Partial or full fields to update
- **Response**: `200 OK` (Updated Lead object)

#### `DELETE /leads/{id}`
- **Response**: `200 OK` / `204 No Content`

---

### 4.3 Contacts (`/contacts`)

#### `GET /contacts`
- **Query Params**: `search`, `limit`, `offset`
- **Response**: `200 OK` (Array of Contact objects)

#### `POST /contacts`
- **Request Body**:
  ```json
  {
    "name": "Priya Patel",
    "company": "TCS",
    "email": "priya@tcs.com",
    "phone": "+919812345678"
  }
  ```
- **Response**: `201 Created`

#### `GET /contacts/{id}`
#### `PUT /contacts/{id}`
#### `DELETE /contacts/{id}`

---

### 4.4 Deals (`/deals`)

#### `GET /deals`
- **Query Params**: `stage` (`lead`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost`), `contact_id`, `search`
- **Response**: `200 OK` (Array of Deal objects)

#### `POST /deals`
- **Request Body**:
  ```json
  {
    "title": "Enterprise Cloud Migration",
    "amount": 50000.00,
    "stage": "proposal",
    "contact_id": 1
  }
  ```
- **Response**: `201 Created`

#### `GET /deals/{id}`
#### `PUT /deals/{id}`
#### `DELETE /deals/{id}`

---

### 4.5 Tasks (`/tasks`)

#### `GET /tasks`
- **Query Params**: `completed` (`true`/`false`), `assigned_to`
- **Response**: `200 OK` (Array of Task objects)

#### `POST /tasks`
- **Request Body**:
  ```json
  {
    "title": "Follow up with Rahul from Infosys",
    "description": "Send updated proposal and pricing breakdown",
    "due_date": "2026-08-15T10:00:00Z"
  }
  ```
- **Response**: `201 Created`

#### `GET /tasks/{id}`
#### `PUT /tasks/{id}`
#### `DELETE /tasks/{id}`

---

### 4.6 Notes (`/notes`)

#### `GET /notes`
- **Query Params**: `lead_id`, `contact_id`
- **Response**: `200 OK` (Array of Note objects)

#### `POST /notes`
- **Request Body**:
  ```json
  {
    "content": "Had introductory discovery call.",
    "lead_id": 1
  }
  ```
- **Response**: `201 Created`

#### `DELETE /notes/{id}`

---

### 4.7 AI Chat (`/ai/chat`)

#### `POST /ai/chat`
Process natural language text input from Android or Web client, forwarding to AI Agent + MCP Tools.
- **Request Body**:
  ```json
  {
    "message": "Add a new lead: Rahul Sharma from Infosys, phone 9876543210",
    "conversation_id": "conv-mobile-001"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "response": "✅ Lead added: Rahul Sharma (Infosys). Assigned to you.",
    "actions_taken": [
      {
        "tool": "add_lead",
        "parameters": {
          "name": "Rahul Sharma",
          "company": "Infosys",
          "phone": "9876543210"
        }
      }
    ]
  }
  ```

---

## 5. Standard Error Responses

```json
{
  "detail": "Error message explanation",
  "status_code": 400
}
```

- `400 Bad Request`: Invalid request body or query parameter format.
- `401 Unauthorized`: Missing or expired Bearer JWT token.
- `403 Forbidden`: Insufficient permissions.
- `404 Not Found`: Resource ID does not exist.
- `500 Internal Server Error`: Unhandled server exception.

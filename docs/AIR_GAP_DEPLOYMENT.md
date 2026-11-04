# Air-Gap Deployment & Data Integration Guide

## 1. What is an Air-Gap Deployment?

An **Air-Gap Deployment** is a software architecture and deployment strategy where systems run completely isolated from external public networks and the internet.

- **No Outbound Traffic**: The application cannot access external CDNs, cloud APIs, package registries (`npm`, `PyPI`), or third-party webhooks.
- **No Inbound Public Traffic**: Access is restricted strictly to local subnet, intranet, internal VPN, or hardware-tethered clients.
- **Zero Cloud Runtime Dependency**: All database services, authentication token verifications, asset bundles, and message queues operate locally on premise.

---

## 2. Step-by-Step Air-Gap Deployment Procedure

### Phase 1: Pre-Airgap Packaging (On an Internet-Connected Machine)
1. **Download and vendor dependencies**:
   ```bash
   # Python wheels
   pip download -r requirements.txt -d ./wheels/
   
   # Frontend static production bundle
   cd frontend
   npm ci
   npm run build
   ```
2. **Containerize / Snapshot Images** (if running Docker):
   ```bash
   docker build -t crm-backend:latest ./backend
   docker build -t crm-frontend:latest ./frontend
   docker save -o crm-images.tar crm-backend:latest crm-frontend:latest
   ```
3. **Transfer to Isolated Environment**:
   - Transfer repository, wheels, built static files, and `.tar` images via an approved secure offline media transfer (e.g. encrypted USB drive / secure bastion).

### Phase 2: Host & Environment Setup (In the Air-Gapped Environment)
1. **Configure Environment Variables** (`.env`):
   ```env
   # Local database (PostgreSQL on local subnet or local SQLite)
   DATABASE_URL=sqlite:///./crm.db
   SECRET_KEY=your_generated_airgap_secret_key_32_bytes_min
   
   # Disable external cloud fallbacks (e.g., Gemini AI or cloud OAuth)
   ENABLE_EXTERNAL_APIS=false
   FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.*
   ```
2. **Install Offline Python Wheels**:
   ```bash
   cd backend
   pip install --no-index --find-links=./wheels/ -r requirements.txt
   ```

### Phase 3: Database Bootstrap & Offline Migrations
Run automatic migrations to build all schemas and edge-case indexes:
```bash
python -c "from app.database.connection import engine; from app.database.migrations import run_migrations; run_migrations(engine)"
python scripts/seed_db.py
```

### Phase 4: Launching Services
```bash
# Start backend on all interfaces for local intranet
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Serve static frontend with local webserver (Nginx or lightweight file server)
cd frontend/dist
npx serve -s . -l 3000
```

---

## 3. Data Integration Testing & Verification

We established automated data integration tests in [`tests/test_data_integration.py`](file:///c:/Users/ATIKA/OneDrive/Desktop/CRM/backend/tests/test_data_integration.py) verifying:

1. **Schema & Constraint Readiness**: All tables and partial unique constraints build and operate correctly without external migration tools.
2. **Local Auth Engine**: Passlib / bcrypt cryptographic verification operates without network dependency.
3. **Full Relational Lifecycle**:
   - Staff hierarchy (Lead & Employee)
   - Customer account creation
   - Order creation
   - Support ticket creation with concurrency row-locks
   - Message persistence & customer sanitization
   - Ticket resolution & 1-5 star ratings

### Running Verification:
```bash
cd backend
python -m pytest tests/test_data_integration.py -v
```

All 14 backend tests (11 edge cases + 3 data integration suites) pass 100% locally.


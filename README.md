# PriceWatch AI — Competitor Pricing Monitor

> **ZIO Hackathon Submission**  
> An autonomous, safety-first AI agent and intelligence dashboard for SMB owners to monitor competitor pricing pages, detect genuine price movements, enforce human-in-the-loop approvals, and independently verify internal benchmark updates.

---

## 1. Problem Statement
An SMB (small or medium-sized business) owner tracks pricing pages of up to 10 competitors and receives alerts on real price changes. Public pricing pages frequently change formatting, currencies, and tier packaging, leading to alert fatigue or silent misses.

### Official Agent Workflow
1. **Collect Details**: Competitor list, comparable plans, alert threshold.
2. **Plan Next Steps**: Normalize currency, normalize billing periods, normalize tier names before comparing.
3. **Find Information**: Retrieve structured data from competitor pricing pages.
4. **Take Action**: Human approval is mandatory. Update an internal price sheet with dated evidence.

---

## 2. Key Features

- **Multi-Competitor Monitoring**: Tracks up to 10 competitors with customizable target URLs and tier definitions.
- **Robust Price & Period Normalization**:
  - Currency normalization with cross-currency display-switch detection (avoids false alerts).
  - Billing period normalization (monthly, annual, weekly).
  - Explicit recognition of unpriced tiers like `"Contact sales"` as `unavailable` rather than `0`.
- **Auditable Evidence Capture**:
  - Machine-readable diffs (`before` vs. `after` JSON snapshots).
  - Source URL logging, timestamped snapshots, and screenshot references.
- **Human-in-the-Loop Approval Queue**:
  - Mandatory review step before updating the internal benchmark sheet.
  - Idempotency guarantees prevent duplicate executions.
- **Independent Read-Back Verification**:
  - Following approved changes, the system independently re-queries the database to verify the stored record matches the approved update.
- **Storefront Isolation**:
  - The internal benchmark sheet is completely decoupled from the merchant's customer-facing storefront; the agent is mathematically and architecturally prohibited from modifying storefront prices.
- **Automated Test Results Dashboard**:
  - One-click execution and real-time pass/fail evaluation of the 4 official test cases (TC1–TC4).

---

## 3. Official Test Cases (TC1 – TC4)

| Test Case | Scenario | Expected Behavior | Actual Behavior & Verification | Status |
|---|---|---|---|:---:|
| **TC1** | Comparable tier price change | Alert generated with dated diff & evidence; proposed update staged for review. | Genuine increase detected (₹999 → ₹1,099/mo, +10.01%). Awaiting approval. | ✅ PASS |
| **TC2** | Currency display switch (USD → INR) | Display currency change alone must **not** trigger a false price change alert. | Classified as currency switch; marked uncertain/display change; no false alert. | ✅ PASS |
| **TC3** | "Contact sales" only | Must mark price as unavailable; cannot record as 0 or invent price drop. | Status flagged as `unavailable`; numeric price remains `null`. | ✅ PASS |
| **TC4** | Internal sheet update after approval | Human approval updates sheet once; verified via independent read-back; storefront untouched. | Sheet entry updated; read-back verification confirmed; idempotent on retries. | ✅ PASS |

---

## 4. Architecture & System Flow

```
┌───────────────────────────────────────────────────────────┐
│                    PriceWatch AI Dashboard                │
│                   (React 19 + Vite + Tailwind)            │
└─────────────┬───────────────────────────────▲─────────────┘
              │ REST API                      │ SSE / Polling
┌─────────────▼───────────────────────────────┴─────────────┐
│                    FastAPI Backend Core                   │
│                                                           │
│  ┌─────────────────┐   ┌────────────────┐   ┌──────────┐  │
│  │ Collector Layer │──►│ Normalization  │──►│ Diff &   │  │
│  │ (Mock / HTTP)   │   │ & Currency Eng │   │ Compare  │  │
│  └─────────────────┘   └────────────────┘   └────┬─────┘  │
│                                                  │        │
│  ┌─────────────────┐   ┌────────────────┐        │        │
│  │  Verification   │◄──│ Human Approval │◄───────┘        │
│  │  (DB Read-back) │   │ Workflow       │ (Awaiting Rev)  │
│  └────────┬────────┘   └────────────────┘                 │
└───────────┼───────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────┐
│              SQLite Relational Database                   │
│   (Competitors, Plans, Observations, Alerts, Sheet)       │
└───────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy ORM, Pydantic v2, Pytest, Uvicorn
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Recharts, Axios, React Router v7
- **Database**: SQLite (ACID-compliant relational store)
- **Architecture**: Decoupled Client-Server with RESTful contracts and Idempotent APIs

---

## 6. Directory Structure

```
competitor-pricing-monitor/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI endpoints & lifecycle
│   │   ├── models.py            # SQLAlchemy schema models (9 entities)
│   │   ├── schemas.py           # Pydantic v2 data models
│   │   ├── services.py          # Business logic, diffing, normalization, TC runner
│   │   ├── database.py          # DB engine & session factory
│   │   └── seed.py              # Demo fixtures & baseline seeding
│   ├── tests/
│   │   └── test_core.py         # 16 unit & integration tests
│   ├── requirements.txt         # Backend Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI widgets (StatCard, AlertRow, etc.)
│   │   ├── layouts/             # Responsive sidebar & navigation shell
│   │   ├── pages/               # Dashboard, Competitors, Monitoring, Alerts, Approvals, Sheet, Tests
│   │   ├── services/api.js      # Axios API client wrapper
│   │   └── utils/format.js      # Currency, percentage, and date formatters
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── architecture.md          # Detailed architectural breakdown
│   ├── testing.md               # Testing guide & assertions
│   └── demo-script.md           # Step-by-step judge demonstration guide
└── README.md
```

---

## 7. Setup & Execution Instructions

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and pnpm / npm

### Step 1: Backend Setup
```powershell
cd backend
python -m pip install -r requirements.txt
python -c "from app.database import init_db; init_db()"
python -m app.seed
uvicorn app.main:app --reload --port 8000
```
*The backend API will be available at `http://localhost:8000/api` with interactive Swagger docs at `http://localhost:8000/docs`.*

### Step 2: Frontend Setup
```powershell
cd frontend
pnpm install
pnpm run dev
```
*The web dashboard will be available at `http://localhost:5173`.*

---

## 8. Running Automated Tests

Run the complete test suite verifying price parsing, currency isolation, TC1–TC4, approval workflows, and CSV export:
```powershell
cd backend
python -m pytest tests/ -v
```
*(All 16 tests will execute and pass deterministically in under 2 seconds).*

---

## 9. Safety & Security Guarantees
1. **Zero Storefront Mutation**: The agent writes exclusively to `internal_sheet`. No connections or API credentials for customer-facing storefronts exist.
2. **Strict Approval Gate**: Updates to the benchmark sheet require a discrete POST to `/api/approvals/{id}/approve`.
3. **Idempotent Operations**: Every approval payload evaluates an idempotency key to prevent double-execution on network retries.
4. **Honest Data Transparency**: Synthetic and mock fixtures are explicitly marked as demo data across both the backend records and frontend UI.
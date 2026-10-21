# Demo Script — PriceWatch AI

## Pre-Demo Setup (2 minutes)

1. Start backend:
   ```powershell
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. Start frontend:
   ```powershell
   cd frontend
   pnpm run dev
   ```

3. Open http://localhost:5173 in browser

## Demo Flow (8-10 minutes)

### 1. Introduction (1 min)
> "PriceWatch AI helps SMB owners automatically monitor competitor pricing pages, detect genuine price changes, and maintain an internal competitive pricing sheet — all with human approval and full evidence trails."

### 2. Show Configured Competitors (1 min)
- Navigate to **Competitors** page
- Show the 4 pre-seeded competitors (A, B, C, D)
- Point out the pricing page URLs and enabled status
- Show the **Plan Mappings** page with configured tier mappings

### 3. Run Monitoring (2 min)
- Navigate to **Monitoring** page
- Click **"Run Monitoring Now"**
- Show the monitoring run progress
- Point out: successful fetches, changes detected, unavailable prices

### 4. TC1 — Genuine Price Change (1.5 min)
- Navigate to **Alerts** page
- Show Competitor A's alert: ₹999 → ₹1,099/month (+10.01%)
- Expand to show evidence: source URL, timestamps, before/after values
- "This is a genuine price increase in the same currency"

### 5. TC2 — Currency Display Change (1 min)
- Show Competitor B's record: $12/month → ₹999/month
- "The system correctly identified this as a currency display change, NOT a real price change"
- "No false alert was generated"

### 6. TC3 — Contact Sales (1 min)
- Show Competitor C: ₹1999/month → "Contact sales"
- "The price is correctly marked as unavailable — no zero price, no fabricated change"

### 7. TC4 — Approval Workflow (2 min)
- Navigate to **Approvals** page
- Show Competitor D's pending approval: ₹500 → ₹550/month
- Click **Approve**
- Navigate to **Internal Sheet**
- Show the updated entry with dated evidence
- "The update was verified via read-back — the stored value matches what was approved"

### 8. Test Results (1 min)
- Navigate to **Test Results** page
- Show all 4 test cases with pass/fail status
- "Every test preserves input, expected result, actual result, and evidence"

## Key Talking Points
- ✅ Real monitoring workflow, not a static dashboard
- ✅ Currency normalization prevents false alerts
- ✅ Human approval required before any sheet update
- ✅ Full evidence trail with timestamps
- ✅ Idempotent execution prevents duplicates
- ✅ Never modifies the user's own storefront

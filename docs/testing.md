# Testing Guide — PriceWatch AI

## Official Test Cases

### TC1 — Comparable Tier Price Change
- **Input**: Competitor A, Basic plan, ₹999/month → ₹1,099/month
- **Expected**: Genuine price-change alert (~10.01% increase), evidence with before/after, proposed internal sheet update (not executed without approval)
- **How to run**: Click "Run All Tests" on the Test Results page, or POST /api/tests/run

### TC2 — Currency Display Change (USD → INR)
- **Input**: Competitor B, Pro plan, $12/month → ₹999/month
- **Expected**: No false price-change alert. System detects currency change, marks as uncertain if equivalence cannot be established
- **How to run**: Same as TC1

### TC3 — Contact Sales Only
- **Input**: Competitor C, Enterprise plan, ₹1999/month → "Contact sales"
- **Expected**: Price marked unavailable. No zero price created. No fabricated change
- **How to run**: Same as TC1

### TC4 — Internal Sheet Update After Approval
- **Input**: Competitor D, Starter plan, ₹500/month → ₹550/month, then approve
- **Expected**: Internal sheet updated exactly once, verified via read-back, old/new values preserved
- **How to run**: Same as TC1, then go to Approvals page and approve the TC4 alert

## Running Backend Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Running via UI

1. Start the backend: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend: `cd frontend && pnpm run dev`
3. Navigate to Test Results page
4. Click "Run All Tests"
5. Verify all 4 test cases show pass/fail status with evidence

## Test Fixtures

All test cases use deterministic mock fixtures (not live website data). The mock HTML pages are embedded in the backend service layer and produce known, reproducible outputs.

## Evidence

Each test run generates:
- `input.json` — Input parameters
- `expected_result.json` — Expected outcome
- `actual_result.json` — Actual outcome
- `diff.json` — Structured comparison
- Pass/fail determination based on actual vs expected comparison

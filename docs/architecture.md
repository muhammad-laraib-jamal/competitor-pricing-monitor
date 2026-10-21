# Architecture — PriceWatch AI

## Overview

PriceWatch AI is a Competitor Pricing Monitor that allows SMB owners to track up to 10 competitors' pricing pages, detect genuine price changes, and receive traceable alerts with human approval for internal sheet updates.

## System Architecture

```
┌─────────────────┐     HTTP/REST     ┌──────────────────┐     SQLite
│   React Frontend │ ──────────────► │  FastAPI Backend   │ ──────────► competitor_monitor.db
│   (Vite + TW)    │ ◄────────────── │  (Python 3.10)     │
└─────────────────┘                  └──────────────────┘
                                            │
                                    ┌───────┴────────┐
                                    │   Collectors    │
                                    ├────────────────┤
                                    │ MockCollector   │
                                    │ HttpCollector   │
                                    │ (Playwright)    │
                                    └────────────────┘
```

## Data Flow

1. **Configuration** — User adds competitors and plan mappings via the dashboard
2. **Collection** — Monitoring run fetches pricing pages using collectors
3. **Parsing** — Raw HTML/text is parsed to extract plan names, prices, currencies, billing periods
4. **Normalization** — Currencies and billing periods are normalized for comparison
5. **Comparison** — New observations are compared against stored baselines
6. **Classification** — Changes are classified: price_change, currency_change, unavailable, no_change, uncertain
7. **Alerting** — Alerts are created for meaningful changes
8. **Evidence** — Screenshots, diffs, and structured data are preserved
9. **Approval** — Human reviews and approves/rejects proposed updates
10. **Execution** — Approved changes update the internal price sheet
11. **Verification** — Read-back confirms the stored value matches the approved change

## Key Entities

| Entity | Purpose |
|--------|---------|
| Competitor | Tracked competitor with pricing page URL |
| PlanMapping | Maps competitor plan names to canonical tiers |
| MonitoringRun | Record of a monitoring execution |
| PriceObservation | Single price data point collected |
| PriceChangeAlert | Detected change with classification |
| ApprovalAction | Human decision on a proposed update |
| InternalSheetEntry | Internal competitive price tracking |
| EvidenceRecord | Supporting evidence for a change |
| TestRun | Official test case execution record |

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios
- **Backend**: Python 3.10, FastAPI, SQLAlchemy, Pydantic
- **Database**: SQLite (MVP)
- **Collection**: Python requests + BeautifulSoup (mock collectors for demo)

## Safety Rules

- Never modify the user's own storefront prices
- Require human approval before internal sheet updates
- Never bypass CAPTCHAs, OTPs, or authentication
- Store evidence for every comparison
- Use idempotent execution to prevent duplicates
- Clearly label mock/synthetic data

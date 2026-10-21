# backend/app/seed.py
"""Seed script for the Competitor Pricing Monitor database.

Populates initial baseline state for the 4 demo competitors:
- Competitor A: Basic plan (₹999/month)
- Competitor B: Pro plan ($12/month)
- Competitor C: Enterprise plan (₹1999/month)
- Competitor D: Starter plan (₹500/month)

Clearly labeled as synthetic/demo data for hackathon demonstrations.
Can be executed standalone: python -m backend.app.seed
"""

import sys
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db
from . import models

# Ensure safe UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DEMO_SEED_DATA = [
    {
        "name": "Competitor A",
        "url": "https://example.com/competitor-a/pricing",
        "plan_name": "Basic",
        "canonical_name": "Basic",
        "billing_period": "monthly",
        "currency": "INR",
        "baseline_text": "₹999/month",
        "baseline_price": 999.0,
        "notes": "[SYNTHETIC DEMO DATA] Competitor A baseline for TC1 price increase test",
    },
    {
        "name": "Competitor B",
        "url": "https://example.com/competitor-b/pricing",
        "plan_name": "Pro",
        "canonical_name": "Pro",
        "billing_period": "monthly",
        "currency": "USD",
        "baseline_text": "$12/month",
        "baseline_price": 12.0,
        "notes": "[SYNTHETIC DEMO DATA] Competitor B baseline for TC2 currency display change test",
    },
    {
        "name": "Competitor C",
        "url": "https://example.com/competitor-c/pricing",
        "plan_name": "Enterprise",
        "canonical_name": "Enterprise",
        "billing_period": "monthly",
        "currency": "INR",
        "baseline_text": "₹1999/month",
        "baseline_price": 1999.0,
        "notes": "[SYNTHETIC DEMO DATA] Competitor C baseline for TC3 contact sales test",
    },
    {
        "name": "Competitor D",
        "url": "https://example.com/competitor-d/pricing",
        "plan_name": "Starter",
        "canonical_name": "Starter",
        "billing_period": "monthly",
        "currency": "INR",
        "baseline_text": "₹500/month",
        "baseline_price": 500.0,
        "notes": "[SYNTHETIC DEMO DATA] Competitor D baseline for TC4 approval & verification test",
    },
]


def seed_db(db: Session = None):
    """Seed the database with baseline demo competitors, plans, and sheet entries."""
    close_after = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_after = True

    try:
        print("[SEED] Starting database seeding with synthetic demo data...")

        for item in DEMO_SEED_DATA:
            # 1. Competitor
            comp = (
                db.query(models.Competitor)
                .filter(models.Competitor.name == item["name"])
                .first()
            )
            if not comp:
                comp = models.Competitor(
                    name=item["name"],
                    price_page_url=item["url"],
                    enabled=True,
                )
                db.add(comp)
                db.commit()
                db.refresh(comp)
                print(f"[SEED] Created competitor: {comp.name}")

            # 2. Plan Mapping
            mapping = (
                db.query(models.PlanMapping)
                .filter(
                    models.PlanMapping.competitor_id == comp.id,
                    models.PlanMapping.raw_plan_name == item["plan_name"],
                )
                .first()
            )
            if not mapping:
                mapping = models.PlanMapping(
                    competitor_id=comp.id,
                    raw_plan_name=item["plan_name"],
                    canonical_name=item["canonical_name"],
                    billing_period=item["billing_period"],
                    currency=item["currency"],
                    alert_threshold=0.0,
                    notes=item["notes"],
                )
                db.add(mapping)
                db.commit()
                db.refresh(mapping)
                print(f"[SEED] Created plan mapping: {comp.name} -> {mapping.canonical_name}")

            # 3. Baseline Price Observation
            obs = (
                db.query(models.PriceObservation)
                .filter(
                    models.PriceObservation.competitor_id == comp.id,
                    models.PriceObservation.plan_mapping_id == mapping.id,
                    models.PriceObservation.raw_price_text == item["baseline_text"],
                )
                .first()
            )
            if not obs:
                obs = models.PriceObservation(
                    competitor_id=comp.id,
                    plan_mapping_id=mapping.id,
                    raw_plan_name=item["plan_name"],
                    raw_price_text=item["baseline_text"],
                    price_amount=item["baseline_price"],
                    currency=item["currency"],
                    billing_period=item["billing_period"],
                    fetched_at=datetime.utcnow(),
                    status="fetched",
                    extraction_method="mock",
                    source_url=item["url"],
                    evidence_screenshot_path=f"/evidence/{comp.name.lower().replace(' ', '_')}_baseline.png",
                    normalization_notes="[SYNTHETIC] Initial baseline observation for evaluation",
                )
                db.add(obs)
                db.commit()
                db.refresh(obs)
                print(f"[SEED] Created baseline observation for {comp.name}: {item['currency']} {item['baseline_price']}")

            # 4. Internal Sheet Entry
            sheet_entry = (
                db.query(models.InternalSheetEntry)
                .filter(
                    models.InternalSheetEntry.competitor_id == comp.id,
                    models.InternalSheetEntry.plan_mapping_id == mapping.id,
                )
                .first()
            )
            if not sheet_entry:
                sheet_entry = models.InternalSheetEntry(
                    competitor_id=comp.id,
                    plan_mapping_id=mapping.id,
                    competitor_name=comp.name,
                    plan_name=mapping.canonical_name,
                    price_amount=item["baseline_price"],
                    currency=item["currency"],
                    billing_period=item["billing_period"],
                    source_url=item["url"],
                    last_updated=datetime.utcnow(),
                    update_count=1,
                )
                db.add(sheet_entry)
                db.commit()
                db.refresh(sheet_entry)
                print(f"[SEED] Created internal sheet entry: {sheet_entry.competitor_name} - {sheet_entry.plan_name}")

        print("[SEED] Seeding successfully completed!")
    finally:
        if close_after:
            db.close()


if __name__ == "__main__":
    seed_db()

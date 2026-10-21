# backend/app/services.py

"""Service layer for the Competitor Pricing Monitor MVP.
Implements CRUD operations, mock monitoring runs, comparison logic,
alert generation, approval workflow, and internal sheet updates.
"""

from datetime import datetime
import re
from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas, database

# -------------------------------------------------
# Competitor CRUD helpers
# -------------------------------------------------

def create_competitor(db: Session, comp_in: schemas.CompetitorCreate) -> models.Competitor:
    db_comp = models.Competitor(
        name=comp_in.name,
        price_page_url=str(comp_in.price_page_url),
        enabled=comp_in.enabled if comp_in.enabled is not None else True,
    )
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp

def get_competitor(db: Session, comp_id: int) -> Optional[models.Competitor]:
    return db.query(models.Competitor).filter(models.Competitor.id == comp_id).first()

def get_competitors(db: Session) -> List[models.Competitor]:
    return db.query(models.Competitor).all()

def update_competitor(db: Session, db_comp: models.Competitor, comp_up: schemas.CompetitorUpdate) -> models.Competitor:
    if comp_up.name is not None:
        db_comp.name = comp_up.name
    if comp_up.price_page_url is not None:
        db_comp.price_page_url = str(comp_up.price_page_url)
    if comp_up.enabled is not None:
        db_comp.enabled = comp_up.enabled
    db.commit()
    db.refresh(db_comp)
    return db_comp

def delete_competitor(db: Session, db_comp: models.Competitor) -> None:
    db.delete(db_comp)
    db.commit()

# -------------------------------------------------
# Helper parsing / normalization utilities
# -------------------------------------------------
_CURRENCY_MAP = {
    "$": "USD",
    "₹": "INR",
    "£": "GBP",
    "€": "EUR",
}

_PRICE_REGEX = re.compile(r"([₹$£€])\s*([\d,]+(?:\.\d+)?)")
_BILLING_REGEX = re.compile(r"(per|/)?\s*(month|year|yr|weekly|week|day|daily)", re.IGNORECASE)

def _parse_price(text: str) -> (Optional[float], Optional[str]):
    """Extract numeric amount and ISO currency code from a price string.
    Returns (amount, currency) or (None, None) if parsing fails.
    """
    if not text:
        return None, None
    match = _PRICE_REGEX.search(text)
    if not match:
        return None, None
    symbol, number = match.groups()
    currency = _CURRENCY_MAP.get(symbol)
    # remove commas and convert to float
    try:
        amount = float(number.replace(",", ""))
    except ValueError:
        amount = None
    return amount, currency

def _parse_billing(text: str) -> Optional[str]:
    if not text:
        return None
    match = _BILLING_REGEX.search(text)
    if not match:
        return None
    period = match.group(2).lower()
    if period.startswith("yr") or period == "year":
        return "annual"
    if period.startswith("month"):
        return "monthly"
    if period.startswith("week"):
        return "weekly"
    if period.startswith("day"):
        return "daily"
    return None

# -------------------------------------------------
# Mock data fixtures for the four official test cases
# -------------------------------------------------
# Each fixture represents a competitor with a previous observation and a new observation.
# The run_mock_monitoring function will insert/replace these observations and generate alerts.

# Fixture structure: (competitor_name, price_page_url, raw_plan_name, prev_price_text, curr_price_text)
_MOCK_FIXTURES = [
    # TC1 – price increase for same currency, same billing
    (
        "Competitor A",
        "https://example.com/competitor-a/pricing",
        "Basic",
        "₹999/month",
        "₹1,099/month",
    ),
    # TC2 – display currency switch USD -> INR, same amount roughly (but we treat as currency change only)
    (
        "Competitor B",
        "https://example.com/competitor-b/pricing",
        "Pro",
        "$12/month",
        "₹999/month",
    ),
    # TC3 – contact sales (price unavailable)
    (
        "Competitor C",
        "https://example.com/competitor-c/pricing",
        "Enterprise",
        "₹1999/month",
        "Contact sales",
    ),
    # TC4 – same as TC1 but will be used to test approval and internal sheet update
    (
        "Competitor D",
        "https://example.com/competitor-d/pricing",
        "Starter",
        "₹500/month",
        "₹550/month",
    ),
]

# -------------------------------------------------
# Monitoring & comparison logic
# -------------------------------------------------

def _create_or_get_competitor(db: Session, name: str, url: str) -> models.Competitor:
    comp = db.query(models.Competitor).filter(models.Competitor.name == name).first()
    if not comp:
        comp = models.Competitor(name=name, price_page_url=url, enabled=True)
        db.add(comp)
        db.commit()
        db.refresh(comp)
    return comp

def _create_plan_mapping(db: Session, competitor: models.Competitor, raw_name: str, canonical: str) -> models.PlanMapping:
    # For simplicity, canonical name equals raw_name here; can be extended later.
    mapping = (
        db.query(models.PlanMapping)
        .filter(models.PlanMapping.competitor_id == competitor.id, models.PlanMapping.raw_plan_name == raw_name)
        .first()
    )
    if not mapping:
        mapping = models.PlanMapping(
            competitor_id=competitor.id,
            raw_plan_name=raw_name,
            canonical_name=canonical,
        )
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
    return mapping

def _store_observation(
    db: Session,
    competitor: models.Competitor,
    mapping: models.PlanMapping,
    raw_price_text: str,
    source_url: str,
) -> models.PriceObservation:
    amount, currency = _parse_price(raw_price_text)
    billing = _parse_billing(raw_price_text)
    status = "fetched"
    if not amount:
        # detect contact sales or unavailable
        if re.search(r"contact sales", raw_price_text, re.IGNORECASE):
            status = "unavailable"
        else:
            status = "error"
    obs = models.PriceObservation(
        competitor_id=competitor.id,
        plan_mapping_id=mapping.id,
        raw_plan_name=mapping.raw_plan_name,
        raw_price_text=raw_price_text,
        price_amount=amount,
        currency=currency,
        billing_period=billing,
        fetched_at=datetime.utcnow(),
        status=status,
        source_url=source_url,
        evidence_screenshot_path=None,  # mock – no real screenshot
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs

def _compare_observations(
    db: Session,
    competitor: models.Competitor,
    mapping: models.PlanMapping,
    prev: models.PriceObservation,
    curr: models.PriceObservation,
) -> Optional[models.Alert]:
    # Determine change type
    if curr.status == "unavailable":
        change_type = "unavailable"
        percent = None
        absolute = None
    elif prev.price_amount is None or curr.price_amount is None:
        # cannot compare numerically
        change_type = "uncertain"
        percent = None
        absolute = None
    elif prev.currency != curr.currency:
        # Currency display change – do not create price_change alert per TC2
        change_type = "currency_change"
        percent = None
        absolute = None
    else:
        # Same currency, numeric values present – compute diff
        absolute = curr.price_amount - prev.price_amount
        if prev.price_amount != 0:
            percent = (absolute / prev.price_amount) * 100
        else:
            percent = None
        # Only alert if absolute change non‑zero and exceeds threshold (we'll use 0 for demo)
        if absolute != 0:
            change_type = "price_change"
        else:
            change_type = "no_change"
    if change_type in ("no_change", "uncertain"):
        return None
    alert = models.Alert(
        competitor_id=competitor.id,
        plan_mapping_id=mapping.id,
        previous_observation_id=prev.id,
        current_observation_id=curr.id,
        change_type=change_type,
        absolute_change=absolute,
        percentage_change=percent,
        created_at=datetime.utcnow(),
        approved=False,
        rejected=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

def run_mock_monitoring(db: Session):
    """Execute a deterministic mock monitoring run for the four official test cases.
    Returns a summary dict.
    """
    summary = {"processed": 0, "alerts_created": 0}
    for name, url, plan_raw, prev_price, curr_price in _MOCK_FIXTURES:
        comp = _create_or_get_competitor(db, name, url)
        mapping = _create_plan_mapping(db, comp, plan_raw, plan_raw)  # canonical same as raw for now
        # Baseline observation – create only if not exists
        prev_obs = (
            db.query(models.PriceObservation)
            .filter(
                models.PriceObservation.competitor_id == comp.id,
                models.PriceObservation.plan_mapping_id == mapping.id,
                models.PriceObservation.raw_price_text == prev_price,
            )
            .order_by(models.PriceObservation.fetched_at.desc())
            .first()
        )
        if not prev_obs:
            prev_obs = _store_observation(db, comp, mapping, prev_price, url)
        # Current observation
        curr_obs = _store_observation(db, comp, mapping, curr_price, url)
        alert = _compare_observations(db, comp, mapping, prev_obs, curr_obs)
        summary["processed"] += 1
        if alert:
            summary["alerts_created"] += 1
    return summary

# -------------------------------------------------
# Alert retrieval and approval workflow
# -------------------------------------------------

def get_alerts(db: Session) -> List[models.Alert]:
    return db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()

def get_alert(db: Session, alert_id: int) -> Optional[models.Alert]:
    return db.query(models.Alert).filter(models.Alert.id == alert_id).first()

def approve_alert(db: Session, alert: models.Alert) -> None:
    if alert.approved or alert.rejected:
        return  # already decided
    alert.approved = True
    db.add(alert)
    # Record approval action
    approval = models.ApprovalAction(alert_id=alert.id, approved=True, timestamp=datetime.utcnow())
    db.add(approval)
    # Update internal sheet – upsert entry
    curr_obs = alert.current_observation
    entry = (
        db.query(models.InternalSheetEntry)
        .filter(models.InternalSheetEntry.competitor_id == alert.competitor_id,
                models.InternalSheetEntry.plan_mapping_id == alert.plan_mapping_id)
        .first()
    )
    if entry:
        entry.price_amount = curr_obs.price_amount or entry.price_amount
        entry.currency = curr_obs.currency or entry.currency
        entry.billing_period = curr_obs.billing_period or entry.billing_period
        entry.last_updated = datetime.utcnow()
        entry.source_url = curr_obs.source_url
    else:
        entry = models.InternalSheetEntry(
            competitor_id=alert.competitor_id,
            plan_mapping_id=alert.plan_mapping_id,
            price_amount=curr_obs.price_amount or 0,
            currency=curr_obs.currency or "",
            billing_period=curr_obs.billing_period,
            last_updated=datetime.utcnow(),
            source_url=curr_obs.source_url,
        )
        db.add(entry)
    db.commit()

def reject_alert(db: Session, alert: models.Alert) -> None:
    if alert.approved or alert.rejected:
        return
    alert.rejected = True
    db.add(alert)
    rejection = models.ApprovalAction(alert_id=alert.id, approved=False, timestamp=datetime.utcnow())
    db.add(rejection)
    db.commit()

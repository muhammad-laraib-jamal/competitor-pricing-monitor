# backend/tests/test_core.py
"""Comprehensive test suite for Competitor Pricing Monitor.

Tests:
- Price extraction & normalization
- Currency detection across locales
- Billing frequency normalization
- Core comparison logic covering all 4 hackathon test cases (TC1 - TC4)
- Enforcing business rules:
    * Never compare amounts across different currencies as a price change
    * 'Contact sales' = unavailable, not zero
    * Approval required before internal sheet update
    * Idempotent execution
    * Read-back verification
- Evidence record snapshot creation
- Official automated test runner verification
- FastAPI route handler integration
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app import models, schemas, services
from backend.app.services import (
    _parse_price,
    _parse_billing,
    store_observation,
    compare_observations,
    approve_action,
    reject_action,
    run_official_test_cases,
    export_internal_sheet_csv,
)
from backend.app.main import (
    health_check,
    list_competitors,
    create_competitor,
    list_plans,
    create_plan,
    get_internal_sheet,
    export_internal_sheet,
    get_dashboard_statistics,
)


@pytest.fixture(scope="function")
def db_session():
    """Create an isolated in-memory SQLite database session for each test."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


# ---------------------------------------------------------------------------
# 1. Price Parsing Tests
# ---------------------------------------------------------------------------

def test_parse_price_indian_rupee():
    """Verify parsing of various INR currency formats."""
    # Standard ₹ symbol
    amount, curr = _parse_price("₹999/month")
    assert amount == 999.0
    assert curr == "INR"

    # With commas
    amount, curr = _parse_price("₹1,099/month")
    assert amount == 1099.0
    assert curr == "INR"

    # Rs prefix
    amount, curr = _parse_price("Rs. 500 / mo")
    assert amount == 500.0
    assert curr == "INR"

    # INR suffix
    amount, curr = _parse_price("1000 INR per month")
    assert amount == 1000.0
    assert curr == "INR"


def test_parse_price_international_currencies():
    """Verify parsing of USD, EUR, GBP formats."""
    amount, curr = _parse_price("$12/month")
    assert amount == 12.0
    assert curr == "USD"

    amount, curr = _parse_price("€49.00 / mo")
    assert amount == 49.0
    assert curr == "EUR"

    amount, curr = _parse_price("£25.50/mo")
    assert amount == 25.5
    assert curr == "GBP"

    amount, curr = _parse_price("$1,299.99/year")
    assert amount == 1299.99
    assert curr == "USD"


def test_parse_price_contact_sales_is_none():
    """Rule verification: 'Contact sales' must return None (never zero)."""
    for text in ["Contact sales", "Contact Sales", "get a quote", "Custom pricing", "Talk to sales"]:
        amount, curr = _parse_price(text)
        assert amount is None, f"Expected None for '{text}', got {amount}"
        assert curr is None


def test_parse_price_empty_and_invalid():
    """Verify edge cases return None."""
    assert _parse_price("") == (None, None)
    assert _parse_price(None) == (None, None)
    assert _parse_price("Free forever") == (None, None)


# ---------------------------------------------------------------------------
# 2. Billing Period Parsing Tests
# ---------------------------------------------------------------------------

def test_parse_billing_normalization():
    """Verify billing periods normalize to canonical forms."""
    assert _parse_billing("₹999/month") == "monthly"
    assert _parse_billing("₹999 per month") == "monthly"
    assert _parse_billing("$12/mo") == "monthly"
    assert _parse_billing("billed monthly") == "monthly"

    assert _parse_billing("$120/year") == "annual"
    assert _parse_billing("₹12,000/yr") == "annual"
    assert _parse_billing("billed annually") == "annual"

    assert _parse_billing("₹250/week") == "weekly"
    assert _parse_billing("₹50/day") == "daily"
    assert _parse_billing("One-time payment of ₹5,000") == "one-time"


# ---------------------------------------------------------------------------
# 3. Core Comparison Logic: Official Test Cases (TC1 - TC4)
# ---------------------------------------------------------------------------

def test_tc1_genuine_price_increase(db_session):
    """TC1: Competitor A, Basic plan, ₹999/month -> ₹1,099/month.
    Expect genuine price increase alert (~10.01%).
    """
    comp = models.Competitor(name="Competitor A", price_page_url="https://example.com/a")
    db_session.add(comp)
    db_session.commit()

    mapping = models.PlanMapping(
        competitor_id=comp.id,
        raw_plan_name="Basic",
        canonical_name="Basic",
        billing_period="monthly",
        currency="INR",
        alert_threshold=0.0,
    )
    db_session.add(mapping)
    db_session.commit()

    prev_obs = store_observation(
        db_session, comp, mapping, "Basic", "₹999/month", "https://example.com/a"
    )
    curr_obs = store_observation(
        db_session, comp, mapping, "Basic", "₹1,099/month", "https://example.com/a"
    )

    alert = compare_observations(db_session, prev_obs, curr_obs, comp, mapping)

    assert alert is not None
    assert alert.change_type == "price_change"
    assert alert.previous_price == 999.0
    assert alert.current_price == 1099.0
    assert alert.absolute_change == 100.0
    assert alert.percentage_change is not None
    assert abs(alert.percentage_change - 10.01) < 0.05
    assert alert.status == "pending"

    # Pending approval should be generated
    approval = (
        db_session.query(models.ApprovalAction)
        .filter(models.ApprovalAction.alert_id == alert.id)
        .first()
    )
    assert approval is not None
    assert approval.status == "pending"
    assert approval.proposed_price == 1099.0


def test_tc2_currency_display_change_suppression(db_session):
    """TC2: Competitor B, Pro plan, $12/month -> ₹999/month.
    Rule: Never compare amounts across different currencies as a price change.
    Expect currency_change alert, no price change percentage, no approval needed.
    """
    comp = models.Competitor(name="Competitor B", price_page_url="https://example.com/b")
    db_session.add(comp)
    db_session.commit()

    mapping = models.PlanMapping(
        competitor_id=comp.id,
        raw_plan_name="Pro",
        canonical_name="Pro",
        billing_period="monthly",
        currency="USD",
    )
    db_session.add(mapping)
    db_session.commit()

    prev_obs = store_observation(
        db_session, comp, mapping, "Pro", "$12/month", "https://example.com/b"
    )
    curr_obs = store_observation(
        db_session, comp, mapping, "Pro", "₹999/month", "https://example.com/b"
    )

    alert = compare_observations(db_session, prev_obs, curr_obs, comp, mapping)

    assert alert is not None
    assert alert.change_type == "currency_change"
    # Ensure numerical comparison was suppressed!
    assert alert.percentage_change is None
    assert alert.absolute_change is None
    assert "cross-currency" in alert.classification_reason.lower() or "currency display changed" in alert.classification_reason.lower()

    # No approval created for sheet price change
    approvals = (
        db_session.query(models.ApprovalAction)
        .filter(models.ApprovalAction.alert_id == alert.id)
        .all()
    )
    assert len(approvals) == 0


def test_tc3_contact_sales_is_unavailable_not_zero(db_session):
    """TC3: Competitor C, Enterprise plan, ₹1999/month -> 'Contact sales'.
    Rule: 'Contact sales' = unavailable, not zero.
    """
    comp = models.Competitor(name="Competitor C", price_page_url="https://example.com/c")
    db_session.add(comp)
    db_session.commit()

    mapping = models.PlanMapping(
        competitor_id=comp.id,
        raw_plan_name="Enterprise",
        canonical_name="Enterprise",
        billing_period="monthly",
        currency="INR",
    )
    db_session.add(mapping)
    db_session.commit()

    prev_obs = store_observation(
        db_session, comp, mapping, "Enterprise", "₹1999/month", "https://example.com/c"
    )
    curr_obs = store_observation(
        db_session, comp, mapping, "Enterprise", "Contact sales", "https://example.com/c"
    )

    # Observation status check
    assert curr_obs.status == "unavailable"
    assert curr_obs.price_amount is None
    assert curr_obs.price_amount != 0.0  # Crucial rule!

    alert = compare_observations(db_session, prev_obs, curr_obs, comp, mapping)
    assert alert is not None
    assert alert.change_type == "unavailable"
    assert alert.current_price is None


def test_tc4_approval_workflow_idempotency_verification(db_session):
    """TC4: Competitor D, Starter plan, ₹500/month -> ₹550/month.
    Tests full lifecycle:
    1. Alert generation
    2. Approval execution
    3. Internal sheet update
    4. Read-back verification
    5. Idempotent re-execution
    """
    comp = models.Competitor(name="Competitor D", price_page_url="https://example.com/d")
    db_session.add(comp)
    db_session.commit()

    mapping = models.PlanMapping(
        competitor_id=comp.id,
        raw_plan_name="Starter",
        canonical_name="Starter",
        billing_period="monthly",
        currency="INR",
    )
    db_session.add(mapping)
    db_session.commit()

    prev_obs = store_observation(
        db_session, comp, mapping, "Starter", "₹500/month", "https://example.com/d"
    )
    curr_obs = store_observation(
        db_session, comp, mapping, "Starter", "₹550/month", "https://example.com/d"
    )

    alert = compare_observations(db_session, prev_obs, curr_obs, comp, mapping)
    assert alert.change_type == "price_change"
    assert alert.percentage_change == 10.0

    # Retrieve created approval
    approval = (
        db_session.query(models.ApprovalAction)
        .filter(models.ApprovalAction.alert_id == alert.id)
        .first()
    )
    assert approval is not None
    assert approval.status == "pending"

    # Execute Approval with Idempotency Key
    approved_action = approve_action(
        db=db_session,
        action_or_alert_id=approval.id,
        idempotency_key="tc4_unique_key_123",
        decided_by="pricing_lead",
        reason="Approved Q4 price match",
    )

    assert approved_action.status == "executed"
    assert approved_action.execution_status == "success"
    assert approved_action.verified is True
    assert "Verified: Internal sheet read-back confirmed" in approved_action.verification_notes

    # Read back internal sheet from DB
    sheet_entry = (
        db_session.query(models.InternalSheetEntry)
        .filter(
            models.InternalSheetEntry.competitor_id == comp.id,
            models.InternalSheetEntry.plan_mapping_id == mapping.id,
        )
        .first()
    )
    assert sheet_entry is not None
    assert sheet_entry.price_amount == 550.0
    assert sheet_entry.currency == "INR"
    assert sheet_entry.update_count == 1

    # Idempotency Test: re-calling approve with same idempotency key
    repeat_action = approve_action(
        db=db_session,
        action_or_alert_id=approval.id,
        idempotency_key="tc4_unique_key_123",
    )
    assert repeat_action.id == approved_action.id
    assert sheet_entry.update_count == 1  # Did NOT double update sheet!


def test_rejection_workflow(db_session):
    """Verify rejecting an approval leaves the internal sheet unmodified."""
    comp = models.Competitor(name="Competitor E", price_page_url="https://example.com/e")
    db_session.add(comp)
    db_session.commit()

    mapping = models.PlanMapping(
        competitor_id=comp.id,
        raw_plan_name="Plan X",
        canonical_name="Plan X",
        billing_period="monthly",
        currency="INR",
    )
    db_session.add(mapping)
    db_session.commit()

    # Pre-existing sheet entry at 1000
    existing_sheet = models.InternalSheetEntry(
        competitor_id=comp.id,
        plan_mapping_id=mapping.id,
        competitor_name=comp.name,
        plan_name=mapping.canonical_name,
        price_amount=1000.0,
        currency="INR",
        billing_period="monthly",
        source_url="https://example.com/e",
        update_count=1,
    )
    db_session.add(existing_sheet)
    db_session.commit()

    prev_obs = store_observation(db_session, comp, mapping, "Plan X", "₹1000/month", "https://example.com/e")
    curr_obs = store_observation(db_session, comp, mapping, "Plan X", "₹1200/month", "https://example.com/e")
    alert = compare_observations(db_session, prev_obs, curr_obs, comp, mapping)

    rejected = reject_action(
        db=db_session,
        action_or_alert_id=alert.id,
        decided_by="admin",
        reason="Competitor price increase not substantiated",
    )

    assert rejected.status == "rejected"
    assert alert.status == "rejected"

    # Verify sheet was untouched
    db_session.refresh(existing_sheet)
    assert existing_sheet.price_amount == 1000.0


def test_evidence_records_created(db_session):
    """Verify evidence snapshots are captured during comparison."""
    comp = models.Competitor(name="Competitor F", price_page_url="https://example.com/f")
    db_session.add(comp)
    db_session.commit()

    prev_obs = store_observation(db_session, comp, None, "Basic", "₹100/mo", "https://example.com/f")
    curr_obs = store_observation(db_session, comp, None, "Basic", "₹150/mo", "https://example.com/f")
    alert = compare_observations(db_session, prev_obs, curr_obs, comp, None)

    evidence = (
        db_session.query(models.EvidenceRecord)
        .filter(models.EvidenceRecord.alert_id == alert.id)
        .first()
    )
    assert evidence is not None
    assert evidence.previous_data_json is not None
    assert evidence.current_data_json is not None
    assert evidence.diff_json is not None
    assert "100" in evidence.previous_data_json
    assert "150" in evidence.current_data_json


def test_official_test_case_runner(db_session):
    """Run all 4 official hackathon test cases via runner and verify 100% pass."""
    results = run_official_test_cases(db_session)
    assert len(results) == 4

    tc_map = {r.test_case_id: r for r in results}
    assert "TC1" in tc_map
    assert "TC2" in tc_map
    assert "TC3" in tc_map
    assert "TC4" in tc_map

    for tc_id, run in tc_map.items():
        assert run.passed is True, f"Official test case {tc_id} failed: {run.diff_json}"


# ---------------------------------------------------------------------------
# 4. API Endpoints & Export Tests
# ---------------------------------------------------------------------------

def test_api_health():
    res = health_check()
    assert res.status == "ok"
    assert "Competitor Pricing Monitor" in res.service


def test_api_competitors_crud(db_session):
    # Create
    created = create_competitor(
        schemas.CompetitorCreate(name="API Test Comp", price_page_url="https://test.com"),
        db=db_session,
    )
    assert created.id is not None
    assert created.name == "API Test Comp"

    # List
    comps = list_competitors(db=db_session)
    assert len(comps) >= 1
    assert any(c.name == "API Test Comp" for c in comps)


def test_api_internal_sheet_and_csv_export(db_session):
    # Insert dummy entry
    comp = models.Competitor(name="CSV Comp", price_page_url="https://csv.com")
    db_session.add(comp)
    db_session.commit()

    entry = models.InternalSheetEntry(
        competitor_id=comp.id,
        competitor_name="CSV Comp",
        plan_name="Standard",
        price_amount=799.0,
        currency="INR",
        billing_period="monthly",
        source_url="https://csv.com",
    )
    db_session.add(entry)
    db_session.commit()

    sheet = get_internal_sheet(db=db_session)
    assert len(sheet) >= 1

    csv_data = export_internal_sheet_csv(db_session)
    assert "Competitor Name" in csv_data
    assert "CSV Comp" in csv_data
    assert "799.00" in csv_data


def test_api_dashboard_stats(db_session):
    stats = get_dashboard_statistics(db=db_session)
    assert stats.total_competitors >= 0
    assert stats.total_monitored_plans >= 0
    assert stats.pending_approvals >= 0

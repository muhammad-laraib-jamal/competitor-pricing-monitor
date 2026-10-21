# backend/app/main.py
"""FastAPI production entry point for the Competitor Pricing Monitor.

Exposes RESTful endpoints for:
- Health check
- Competitors management (CRUD)
- Canonical plan mappings (CRUD)
- Monitoring runs (Trigger, List, Detail)
- Price observations
- Price change alerts & Evidence
- Human-in-the-loop approvals (Approve, Reject, Idempotent execution)
- Verified internal benchmark price sheet & CSV export
- Automated execution of the 4 official test cases (TC1 - TC4)
- Verification read-back inspection
- Live dashboard metrics
"""

from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from . import models, schemas, database, services

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is initialized on application startup."""
    database.init_db()
    yield

# Application instantiation
app = FastAPI(
    title="Competitor Pricing Monitor API",
    description="Intelligent SaaS pricing monitor with strict business rules, human approval workflows, and audit evidence.",
    version="1.0.0",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()



# ---------------------------------------------------------------------------
# Helper Enrichers
# ---------------------------------------------------------------------------

def _enrich_competitor(comp: models.Competitor) -> schemas.CompetitorOut:
    return schemas.CompetitorOut(
        id=comp.id,
        name=comp.name,
        price_page_url=comp.price_page_url,
        enabled=comp.enabled,
        created_at=comp.created_at,
        updated_at=comp.updated_at,
        plans_count=len(comp.plan_mappings) if comp.plan_mappings else 0,
    )


def _enrich_plan(plan: models.PlanMapping) -> schemas.PlanMappingOut:
    return schemas.PlanMappingOut(
        id=plan.id,
        competitor_id=plan.competitor_id,
        raw_plan_name=plan.raw_plan_name,
        canonical_name=plan.canonical_name,
        billing_period=plan.billing_period,
        currency=plan.currency,
        alert_threshold=plan.alert_threshold,
        notes=plan.notes,
        created_at=plan.created_at,
        competitor_name=plan.competitor.name if plan.competitor else None,
    )


def _enrich_alert(alert: models.PriceChangeAlert) -> schemas.PriceChangeAlertOut:
    comp_name = alert.competitor.name if alert.competitor else None
    plan_name = (
        alert.plan_mapping.canonical_name
        if alert.plan_mapping
        else (alert.current_observation.raw_plan_name if alert.current_observation else None)
    )
    return schemas.PriceChangeAlertOut(
        id=alert.id,
        competitor_id=alert.competitor_id,
        plan_mapping_id=alert.plan_mapping_id,
        monitoring_run_id=alert.monitoring_run_id,
        previous_observation_id=alert.previous_observation_id,
        current_observation_id=alert.current_observation_id,
        change_type=alert.change_type,
        previous_price=alert.previous_price,
        previous_currency=alert.previous_currency,
        previous_billing=alert.previous_billing,
        current_price=alert.current_price,
        current_currency=alert.current_currency,
        current_billing=alert.current_billing,
        absolute_change=alert.absolute_change,
        percentage_change=alert.percentage_change,
        classification_reason=alert.classification_reason,
        confidence=alert.confidence,
        created_at=alert.created_at,
        status=alert.status,
        competitor_name=comp_name,
        plan_name=plan_name,
    )


def _enrich_approval(action: models.ApprovalAction) -> schemas.ApprovalActionOut:
    comp_name = None
    plan_name = None
    if action.alert:
        if action.alert.competitor:
            comp_name = action.alert.competitor.name
        if action.alert.plan_mapping:
            plan_name = action.alert.plan_mapping.canonical_name
        elif action.alert.current_observation:
            plan_name = action.alert.current_observation.raw_plan_name

    return schemas.ApprovalActionOut(
        id=action.id,
        alert_id=action.alert_id,
        action_type=action.action_type,
        status=action.status,
        idempotency_key=action.idempotency_key,
        proposed_price=action.proposed_price,
        proposed_currency=action.proposed_currency,
        proposed_billing=action.proposed_billing,
        previous_sheet_price=action.previous_sheet_price,
        previous_sheet_currency=action.previous_sheet_currency,
        requested_at=action.requested_at,
        decided_at=action.decided_at,
        decided_by=action.decided_by,
        reason=action.reason,
        execution_status=action.execution_status,
        executed_at=action.executed_at,
        verified=action.verified,
        verified_at=action.verified_at,
        verification_notes=action.verification_notes,
        competitor_name=comp_name,
        plan_name=plan_name,
    )


# ---------------------------------------------------------------------------
# Health & Status
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=schemas.HealthResponse, tags=["System"])
def health_check():
    """Verify system health and database readiness."""
    return schemas.HealthResponse()


# ---------------------------------------------------------------------------
# Competitors CRUD
# ---------------------------------------------------------------------------

@app.get("/api/competitors", response_model=List[schemas.CompetitorOut], tags=["Competitors"])
def list_competitors(db: Session = Depends(get_db)):
    """List all registered competitors."""
    competitors = services.get_competitors(db)
    return [_enrich_competitor(c) for c in competitors]


@app.post(
    "/api/competitors",
    response_model=schemas.CompetitorOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Competitors"],
)
def create_competitor(comp: schemas.CompetitorCreate, db: Session = Depends(get_db)):
    """Register a new competitor to monitor."""
    existing = db.query(models.Competitor).filter(models.Competitor.name == comp.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Competitor with name '{comp.name}' already exists.",
        )
    new_comp = services.create_competitor(db, comp)
    return _enrich_competitor(new_comp)


@app.get("/api/competitors/{comp_id}", response_model=schemas.CompetitorOut, tags=["Competitors"])
def get_competitor(comp_id: int, db: Session = Depends(get_db)):
    """Retrieve competitor by ID."""
    comp = services.get_competitor(db, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found.")
    return _enrich_competitor(comp)


@app.put("/api/competitors/{comp_id}", response_model=schemas.CompetitorOut, tags=["Competitors"])
def update_competitor(
    comp_id: int,
    comp_update: schemas.CompetitorUpdate,
    db: Session = Depends(get_db),
):
    """Update competitor details."""
    comp = services.get_competitor(db, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found.")
    updated = services.update_competitor(db, comp, comp_update)
    return _enrich_competitor(updated)


@app.delete("/api/competitors/{comp_id}", response_model=schemas.MessageResponse, tags=["Competitors"])
def delete_competitor(comp_id: int, db: Session = Depends(get_db)):
    """Delete competitor and all associated mappings/observations."""
    comp = services.get_competitor(db, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found.")
    services.delete_competitor(db, comp)
    return schemas.MessageResponse(detail=f"Competitor '{comp.name}' deleted successfully.")


# ---------------------------------------------------------------------------
# Canonical Plan Mappings CRUD
# ---------------------------------------------------------------------------

@app.get("/api/plans", response_model=List[schemas.PlanMappingOut], tags=["Plans"])
def list_plans(
    competitor_id: Optional[int] = Query(default=None, description="Filter by competitor"),
    db: Session = Depends(get_db),
):
    """List canonical plan mappings."""
    plans = services.get_plan_mappings(db, competitor_id=competitor_id)
    return [_enrich_plan(p) for p in plans]


@app.post(
    "/api/plans",
    response_model=schemas.PlanMappingOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Plans"],
)
def create_plan(plan: schemas.PlanMappingCreate, db: Session = Depends(get_db)):
    """Create a new plan mapping for a competitor."""
    comp = services.get_competitor(db, plan.competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Target competitor not found.")
    new_plan = services.create_plan_mapping(db, plan)
    return _enrich_plan(new_plan)


@app.get("/api/plans/{plan_id}", response_model=schemas.PlanMappingOut, tags=["Plans"])
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    """Retrieve plan mapping by ID."""
    plan = services.get_plan_mapping(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan mapping not found.")
    return _enrich_plan(plan)


@app.put("/api/plans/{plan_id}", response_model=schemas.PlanMappingOut, tags=["Plans"])
def update_plan(
    plan_id: int,
    plan_update: schemas.PlanMappingUpdate,
    db: Session = Depends(get_db),
):
    """Update canonical plan mapping."""
    plan = services.get_plan_mapping(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan mapping not found.")
    updated = services.update_plan_mapping(db, plan, plan_update)
    return _enrich_plan(updated)


@app.delete("/api/plans/{plan_id}", response_model=schemas.MessageResponse, tags=["Plans"])
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    """Delete canonical plan mapping."""
    plan = services.get_plan_mapping(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan mapping not found.")
    services.delete_plan_mapping(db, plan)
    return schemas.MessageResponse(detail=f"Plan mapping '{plan.canonical_name}' deleted.")


# ---------------------------------------------------------------------------
# Monitoring Runs
# ---------------------------------------------------------------------------

@app.post("/api/monitoring/run", response_model=schemas.MonitoringRunOut, tags=["Monitoring"])
def trigger_monitoring_run(
    request: Optional[schemas.MonitoringRunTriggerRequest] = None,
    db: Session = Depends(get_db),
):
    """Trigger a monitoring run. Executes fixtures for official test cases."""
    collector = request.collector_type if request else "mock"
    run = services.run_mock_monitoring(db, collector_type=collector)
    return run


@app.get("/api/monitoring/runs", response_model=List[schemas.MonitoringRunOut], tags=["Monitoring"])
def list_monitoring_runs(db: Session = Depends(get_db)):
    """List past monitoring runs ordered chronologically (newest first)."""
    runs = db.query(models.MonitoringRun).order_by(models.MonitoringRun.started_at.desc()).all()
    return runs


@app.get("/api/monitoring/runs/{run_id}", response_model=schemas.MonitoringRunDetailOut, tags=["Monitoring"])
def get_monitoring_run(run_id: int, db: Session = Depends(get_db)):
    """Retrieve detailed monitoring run metrics including observations and alerts."""
    run = db.query(models.MonitoringRun).filter(models.MonitoringRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Monitoring run not found.")

    obs_list = []
    for obs in run.observations:
        obs_dict = schemas.PriceObservationOut.model_validate(obs)
        obs_dict.competitor_name = obs.competitor.name if obs.competitor else None
        obs_list.append(obs_dict)

    alerts_list = [_enrich_alert(a) for a in run.alerts]

    return schemas.MonitoringRunDetailOut(
        id=run.id,
        started_at=run.started_at,
        completed_at=run.completed_at,
        status=run.status,
        total_competitors=run.total_competitors,
        successful=run.successful,
        failed=run.failed,
        changes_detected=run.changes_detected,
        collector_type=run.collector_type,
        observations=obs_list,
        alerts=alerts_list,
    )


# ---------------------------------------------------------------------------
# Price Observations
# ---------------------------------------------------------------------------

@app.get("/api/observations", response_model=List[schemas.PriceObservationOut], tags=["Observations"])
def list_observations(
    competitor_id: Optional[int] = Query(default=None),
    run_id: Optional[int] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve recorded price observations with filtering options."""
    q = db.query(models.PriceObservation)
    if competitor_id is not None:
        q = q.filter(models.PriceObservation.competitor_id == competitor_id)
    if run_id is not None:
        q = q.filter(models.PriceObservation.monitoring_run_id == run_id)

    observations = q.order_by(models.PriceObservation.fetched_at.desc()).limit(limit).all()

    results = []
    for obs in observations:
        item = schemas.PriceObservationOut.model_validate(obs)
        item.competitor_name = obs.competitor.name if obs.competitor else None
        results.append(item)
    return results


# ---------------------------------------------------------------------------
# Price Change Alerts & Evidence Records
# ---------------------------------------------------------------------------

@app.get("/api/alerts", response_model=List[schemas.PriceChangeAlertOut], tags=["Alerts"])
def list_alerts(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    competitor_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    """List price change alerts."""
    q = db.query(models.PriceChangeAlert)
    if status_filter:
        q = q.filter(models.PriceChangeAlert.status == status_filter)
    if competitor_id:
        q = q.filter(models.PriceChangeAlert.competitor_id == competitor_id)

    alerts = q.order_by(models.PriceChangeAlert.created_at.desc()).all()
    return [_enrich_alert(a) for a in alerts]


@app.get("/api/alerts/{alert_id}", response_model=schemas.PriceChangeAlertDetailOut, tags=["Alerts"])
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Retrieve single alert with comprehensive evidence and approval history."""
    alert = db.query(models.PriceChangeAlert).filter(models.PriceChangeAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    prev_obs = None
    if alert.previous_observation:
        prev_obs = schemas.PriceObservationOut.model_validate(alert.previous_observation)
        prev_obs.competitor_name = alert.competitor.name if alert.competitor else None

    curr_obs = None
    if alert.current_observation:
        curr_obs = schemas.PriceObservationOut.model_validate(alert.current_observation)
        curr_obs.competitor_name = alert.competitor.name if alert.competitor else None

    evidence_records = [
        schemas.EvidenceRecordOut.model_validate(e) for e in alert.evidence_records
    ]
    approvals = [_enrich_approval(ap) for ap in alert.approval_actions]

    base_alert = _enrich_alert(alert)

    return schemas.PriceChangeAlertDetailOut(
        **base_alert.model_dump(),
        previous_observation=prev_obs,
        current_observation=curr_obs,
        evidence_records=evidence_records,
        approval_actions=approvals,
    )


@app.get("/api/evidence/{evidence_id}", response_model=schemas.EvidenceRecordOut, tags=["Alerts"])
def get_evidence(evidence_id: int, db: Session = Depends(get_db)):
    """Retrieve an individual evidence record with snapshots and diff JSON."""
    ev = db.query(models.EvidenceRecord).filter(models.EvidenceRecord.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found.")
    return schemas.EvidenceRecordOut.model_validate(ev)


# ---------------------------------------------------------------------------
# Approvals Workflow (Human-in-the-Loop)
# ---------------------------------------------------------------------------

@app.get("/api/approvals", response_model=List[schemas.ApprovalActionOut], tags=["Approvals"])
def list_approvals(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    """List pending or historic human approval actions."""
    q = db.query(models.ApprovalAction)
    if status_filter:
        q = q.filter(models.ApprovalAction.status == status_filter)
    approvals = q.order_by(models.ApprovalAction.requested_at.desc()).all()
    return [_enrich_approval(a) for a in approvals]


@app.post("/api/approvals/{id}/approve", response_model=schemas.ApprovalActionOut, tags=["Approvals"])
def approve_proposal(
    id: int,
    body: Optional[schemas.ApprovalDecisionRequest] = None,
    db: Session = Depends(get_db),
):
    """Approve a proposed price change. Updates internal sheet with verification & idempotency."""
    try:
        idempotency_key = body.idempotency_key if body else None
        decided_by = body.decided_by if body and body.decided_by else "admin"
        reason = body.reason if body else "Approved by operator"

        action = services.approve_action(
            db=db,
            action_or_alert_id=id,
            idempotency_key=idempotency_key,
            decided_by=decided_by,
            reason=reason,
        )
        return _enrich_approval(action)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval execution error: {str(e)}")


@app.post("/api/approvals/{id}/reject", response_model=schemas.ApprovalActionOut, tags=["Approvals"])
def reject_proposal(
    id: int,
    body: Optional[schemas.ApprovalDecisionRequest] = None,
    db: Session = Depends(get_db),
):
    """Reject a proposed price update. Leaves internal price sheet untouched."""
    try:
        decided_by = body.decided_by if body and body.decided_by else "admin"
        reason = body.reason if body else "Rejected by operator"

        action = services.reject_action(
            db=db,
            action_or_alert_id=id,
            decided_by=decided_by,
            reason=reason,
        )
        return _enrich_approval(action)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rejection error: {str(e)}")


# ---------------------------------------------------------------------------
# Internal Master Price Sheet & CSV Export
# ---------------------------------------------------------------------------

@app.get("/api/internal-sheet", response_model=List[schemas.InternalSheetEntryOut], tags=["Internal Sheet"])
def get_internal_sheet(db: Session = Depends(get_db)):
    """Retrieve all entries from the verified internal master competitor price sheet."""
    entries = services.get_internal_sheet_entries(db)
    return [schemas.InternalSheetEntryOut.model_validate(e) for e in entries]


@app.get("/api/internal-sheet/export", tags=["Internal Sheet"])
def export_internal_sheet(db: Session = Depends(get_db)):
    """Export the internal competitor pricing benchmark sheet as CSV."""
    csv_content = services.export_internal_sheet_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=competitor_pricing_sheet.csv",
        },
    )


# ---------------------------------------------------------------------------
# Verification Inspection
# ---------------------------------------------------------------------------

@app.get("/api/verification/{id}", response_model=schemas.VerificationResultOut, tags=["Verification"])
def get_verification(id: int, db: Session = Depends(get_db)):
    """Inspect read-back verification status for an approval action or internal sheet entry."""
    try:
        result = services.get_verification_details(db, id)
        return schemas.VerificationResultOut(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------------------------
# Official Test Cases Execution (TC1 - TC4)
# ---------------------------------------------------------------------------

@app.get("/api/tests", response_model=List[schemas.TestRunOut], tags=["Official Tests"])
def list_test_runs(db: Session = Depends(get_db)):
    """Retrieve history of official test case execution runs."""
    runs = db.query(models.TestRun).order_by(models.TestRun.ran_at.desc()).limit(20).all()
    return [schemas.TestRunOut.model_validate(r) for r in runs]


@app.post("/api/tests/run", response_model=List[schemas.TestRunOut], tags=["Official Tests"])
def execute_official_tests(db: Session = Depends(get_db)):
    """Execute all 4 official hackathon test cases deterministically and return verification results."""
    runs = services.run_official_test_cases(db)
    return [schemas.TestRunOut.model_validate(r) for r in runs]


@app.get("/api/tests/{id}", response_model=schemas.TestRunOut, tags=["Official Tests"])
def get_test_run(id: int, db: Session = Depends(get_db)):
    """Retrieve a single official test case result."""
    run = db.query(models.TestRun).filter(models.TestRun.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run record not found.")
    return schemas.TestRunOut.model_validate(run)


# ---------------------------------------------------------------------------
# Dashboard Statistics
# ---------------------------------------------------------------------------

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStatsOut, tags=["Dashboard"])
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """Compile aggregated statistics for real-time dashboard display."""
    stats = services.get_dashboard_stats(db)
    last_run_out = None
    if stats["last_run"]:
        last_run_out = schemas.MonitoringRunOut.model_validate(stats["last_run"])

    return schemas.DashboardStatsOut(
        total_competitors=stats["total_competitors"],
        active_competitors=stats["active_competitors"],
        total_monitored_plans=stats["total_monitored_plans"],
        total_observations=stats["total_observations"],
        total_alerts=stats["total_alerts"],
        pending_approvals=stats["pending_approvals"],
        approved_actions=stats["approved_actions"],
        rejected_actions=stats["rejected_actions"],
        internal_sheet_entries=stats["internal_sheet_entries"],
        last_run=last_run_out,
    )

# backend/app/schemas.py
"""Pydantic schemas for the Competitor Pricing Monitor API.

Uses Pydantic v2 conventions with model_config = ConfigDict(from_attributes=True).
Provides strict validation, rich metadata, and serialization models for all endpoints.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Common / System Schemas
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    detail: str
    success: bool = True


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "Competitor Pricing Monitor Backend"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Competitor Schemas
# ---------------------------------------------------------------------------

class CompetitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Name of the competitor")
    price_page_url: str = Field(..., min_length=1, description="URL where pricing is published")
    enabled: Optional[bool] = Field(default=True, description="Whether monitoring is active")


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    price_page_url: Optional[str] = Field(default=None, min_length=1)
    enabled: Optional[bool] = None


class CompetitorOut(CompetitorBase):
    id: int
    created_at: datetime
    updated_at: datetime
    plans_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Plan Mapping Schemas
# ---------------------------------------------------------------------------

class PlanMappingBase(BaseModel):
    raw_plan_name: str = Field(..., min_length=1, description="Plan name on competitor site")
    canonical_name: str = Field(..., min_length=1, description="Canonical internal name")
    billing_period: Optional[str] = Field(default="monthly", description="e.g. monthly, annual")
    currency: Optional[str] = Field(default="INR", description="e.g. INR, USD")
    alert_threshold: Optional[float] = Field(default=0.0, ge=0.0, description="Minimum % change to alert")
    notes: Optional[str] = None


class PlanMappingCreate(PlanMappingBase):
    competitor_id: int = Field(..., description="ID of the competitor")


class PlanMappingUpdate(BaseModel):
    raw_plan_name: Optional[str] = None
    canonical_name: Optional[str] = None
    billing_period: Optional[str] = None
    currency: Optional[str] = None
    alert_threshold: Optional[float] = None
    notes: Optional[str] = None


class PlanMappingOut(PlanMappingBase):
    id: int
    competitor_id: int
    created_at: datetime
    competitor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Monitoring Run Schemas
# ---------------------------------------------------------------------------

class MonitoringRunTriggerRequest(BaseModel):
    collector_type: Optional[str] = Field(default="mock", description="Collector mode: 'mock' or 'live'")
    competitor_ids: Optional[List[int]] = Field(default=None, description="Optional filter of competitor IDs")


class MonitoringRunOut(BaseModel):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    total_competitors: int
    successful: int
    failed: int
    changes_detected: int
    collector_type: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Price Observation Schemas
# ---------------------------------------------------------------------------

class PriceObservationBase(BaseModel):
    raw_plan_name: str
    raw_price_text: Optional[str] = None
    price_amount: Optional[float] = None
    currency: Optional[str] = None
    billing_period: Optional[str] = None
    status: str = "fetched"
    extraction_method: str = "regex"
    source_url: str
    evidence_screenshot_path: Optional[str] = None
    raw_html_excerpt: Optional[str] = None
    normalization_notes: Optional[str] = None


class PriceObservationCreate(PriceObservationBase):
    competitor_id: int
    plan_mapping_id: Optional[int] = None
    monitoring_run_id: Optional[int] = None


class PriceObservationOut(PriceObservationBase):
    id: int
    competitor_id: int
    plan_mapping_id: Optional[int] = None
    monitoring_run_id: Optional[int] = None
    fetched_at: datetime
    competitor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Evidence Record Schemas
# ---------------------------------------------------------------------------

class EvidenceRecordOut(BaseModel):
    id: int
    alert_id: Optional[int] = None
    observation_id: Optional[int] = None
    source_url: str
    screenshot_path: Optional[str] = None
    collected_at: datetime
    previous_data_json: Optional[str] = None
    current_data_json: Optional[str] = None
    diff_json: Optional[str] = None
    comparison_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Price Change Alert Schemas
# ---------------------------------------------------------------------------

class PriceChangeAlertOut(BaseModel):
    id: int
    competitor_id: int
    plan_mapping_id: Optional[int] = None
    monitoring_run_id: Optional[int] = None
    previous_observation_id: Optional[int] = None
    current_observation_id: int
    change_type: str
    previous_price: Optional[float] = None
    previous_currency: Optional[str] = None
    previous_billing: Optional[str] = None
    current_price: Optional[float] = None
    current_currency: Optional[str] = None
    current_billing: Optional[str] = None
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None
    classification_reason: Optional[str] = None
    confidence: float
    created_at: datetime
    status: str
    competitor_name: Optional[str] = None
    plan_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Forward declaration / child schema resolution
class ApprovalActionOut(BaseModel):
    id: int
    alert_id: int
    action_type: str
    status: str
    idempotency_key: Optional[str] = None
    proposed_price: Optional[float] = None
    proposed_currency: Optional[str] = None
    proposed_billing: Optional[str] = None
    previous_sheet_price: Optional[float] = None
    previous_sheet_currency: Optional[str] = None
    requested_at: datetime
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None
    reason: Optional[str] = None
    execution_status: str
    executed_at: Optional[datetime] = None
    verified: bool
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    competitor_name: Optional[str] = None
    plan_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PriceChangeAlertDetailOut(PriceChangeAlertOut):
    previous_observation: Optional[PriceObservationOut] = None
    current_observation: Optional[PriceObservationOut] = None
    evidence_records: List[EvidenceRecordOut] = []
    approval_actions: List[ApprovalActionOut] = []

    model_config = ConfigDict(from_attributes=True)


class MonitoringRunDetailOut(MonitoringRunOut):
    observations: List[PriceObservationOut] = []
    alerts: List[PriceChangeAlertOut] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Approval Workflow Schemas
# ---------------------------------------------------------------------------

class ApprovalDecisionRequest(BaseModel):
    idempotency_key: Optional[str] = Field(default=None, description="Unique key preventing double execution")
    decided_by: Optional[str] = Field(default="admin", description="Operator approving or rejecting")
    reason: Optional[str] = Field(default=None, description="Operational justification or rationale")


class ApprovalActionDetailOut(ApprovalActionOut):
    alert: Optional[PriceChangeAlertOut] = None


# ---------------------------------------------------------------------------
# Internal Price Sheet Schemas
# ---------------------------------------------------------------------------

class InternalSheetEntryCreate(BaseModel):
    competitor_id: int
    plan_mapping_id: Optional[int] = None
    competitor_name: str
    plan_name: str
    price_amount: float
    currency: str
    billing_period: Optional[str] = "monthly"
    source_url: str


class InternalSheetEntryUpdate(BaseModel):
    price_amount: Optional[float] = None
    currency: Optional[str] = None
    billing_period: Optional[str] = None
    source_url: Optional[str] = None


class InternalSheetEntryOut(BaseModel):
    id: int
    competitor_id: int
    plan_mapping_id: Optional[int] = None
    competitor_name: str
    plan_name: str
    price_amount: float
    currency: str
    billing_period: Optional[str] = None
    source_url: str
    last_updated: datetime
    approval_id: Optional[int] = None
    update_count: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Verification Schemas
# ---------------------------------------------------------------------------

class VerificationResultOut(BaseModel):
    verified: bool
    approval_id: Optional[int] = None
    internal_sheet_id: Optional[int] = None
    competitor_name: Optional[str] = None
    plan_name: Optional[str] = None
    expected_price: Optional[float] = None
    actual_price: Optional[float] = None
    expected_currency: Optional[str] = None
    actual_currency: Optional[str] = None
    status: str
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Official Test Case Execution Schemas
# ---------------------------------------------------------------------------

class TestRunOut(BaseModel):
    id: int
    test_case_id: str
    test_name: str
    input_json: str
    expected_result_json: str
    actual_result_json: str
    passed: bool
    evidence_path: Optional[str] = None
    screenshot_path: Optional[str] = None
    diff_json: Optional[str] = None
    explanation: Optional[str] = None
    ran_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestRunSummaryOut(BaseModel):
    total_tests: int
    passed_tests: int
    failed_tests: int
    all_passed: bool
    executed_at: datetime
    results: List[TestRunOut]


# ---------------------------------------------------------------------------
# Dashboard Statistics Schema
# ---------------------------------------------------------------------------

class DashboardStatsOut(BaseModel):
    total_competitors: int
    active_competitors: int
    total_monitored_plans: int
    total_observations: int
    total_alerts: int
    pending_approvals: int
    approved_actions: int
    rejected_actions: int
    internal_sheet_entries: int
    last_run: Optional[MonitoringRunOut] = None

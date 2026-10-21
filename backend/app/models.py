# backend/app/models.py
"""SQLAlchemy models for the Competitor Pricing Monitor.

Complete production-quality data models supporting:
- Competitor tracking
- Canonical plan mappings
- Batch & periodic monitoring runs
- Detailed raw and normalized price observations
- Smart price change alerts with classification
- Human-in-the-loop approval workflows with idempotency & verification
- Internal master pricing sheets
- Rich evidence recording (JSON diffs, screenshot paths, source citations)
- Automated official test case runs (TC1 - TC4)
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from .database import Base


class Competitor(Base):
    """Monitored competitor entity."""
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    price_page_url = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    plan_mappings = relationship(
        "PlanMapping",
        back_populates="competitor",
        cascade="all, delete-orphan",
    )
    observations = relationship(
        "PriceObservation",
        back_populates="competitor",
        cascade="all, delete-orphan",
    )
    alerts = relationship(
        "PriceChangeAlert",
        back_populates="competitor",
        cascade="all, delete-orphan",
    )
    sheet_entries = relationship(
        "InternalSheetEntry",
        back_populates="competitor",
        cascade="all, delete-orphan",
    )


class PlanMapping(Base):
    """Maps a competitor's raw plan name to our canonical plan representation."""
    __tablename__ = "plan_mappings"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    raw_plan_name = Column(String, nullable=False)
    canonical_name = Column(String, nullable=False)
    billing_period = Column(String, nullable=True)  # e.g., "monthly", "annual"
    currency = Column(String, nullable=True)  # ISO code e.g. "INR", "USD"
    alert_threshold = Column(Float, default=0.0, nullable=False)  # % change threshold
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    competitor = relationship("Competitor", back_populates="plan_mappings")
    observations = relationship("PriceObservation", back_populates="plan_mapping")
    alerts = relationship("PriceChangeAlert", back_populates="plan_mapping")
    sheet_entries = relationship("InternalSheetEntry", back_populates="plan_mapping")


class MonitoringRun(Base):
    """Audit log of a monitoring run execution."""
    __tablename__ = "monitoring_runs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running", nullable=False)  # running, completed, failed
    total_competitors = Column(Integer, default=0, nullable=False)
    successful = Column(Integer, default=0, nullable=False)
    failed = Column(Integer, default=0, nullable=False)
    changes_detected = Column(Integer, default=0, nullable=False)
    collector_type = Column(String, default="mock", nullable=False)  # mock, live_crawler, scheduled

    # Relationships
    observations = relationship("PriceObservation", back_populates="monitoring_run")
    alerts = relationship("PriceChangeAlert", back_populates="monitoring_run")


class PriceObservation(Base):
    """Raw and parsed pricing observation fetched from a competitor's page."""
    __tablename__ = "price_observations"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True, index=True)
    monitoring_run_id = Column(Integer, ForeignKey("monitoring_runs.id"), nullable=True, index=True)
    raw_plan_name = Column(String, nullable=False)
    raw_price_text = Column(String, nullable=True)
    price_amount = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    billing_period = Column(String, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, default="fetched", nullable=False)  # fetched, unavailable, error
    extraction_method = Column(String, default="regex", nullable=False)  # regex, mock, html_parser
    source_url = Column(String, nullable=False)
    evidence_screenshot_path = Column(String, nullable=True)
    raw_html_excerpt = Column(Text, nullable=True)
    normalization_notes = Column(Text, nullable=True)

    # Relationships
    competitor = relationship("Competitor", back_populates="observations")
    plan_mapping = relationship("PlanMapping", back_populates="observations")
    monitoring_run = relationship("MonitoringRun", back_populates="observations")
    evidence_records = relationship("EvidenceRecord", back_populates="observation")


class PriceChangeAlert(Base):
    """Smart price change alert triggered by comparing successive observations."""
    __tablename__ = "price_change_alerts"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True, index=True)
    monitoring_run_id = Column(Integer, ForeignKey("monitoring_runs.id"), nullable=True, index=True)
    previous_observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=True)
    current_observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=False)
    change_type = Column(
        String,
        nullable=False,
    )  # price_change, currency_change, unavailable, no_change, initial_baseline
    previous_price = Column(Float, nullable=True)
    previous_currency = Column(String, nullable=True)
    previous_billing = Column(String, nullable=True)
    current_price = Column(Float, nullable=True)
    current_currency = Column(String, nullable=True)
    current_billing = Column(String, nullable=True)
    absolute_change = Column(Float, nullable=True)
    percentage_change = Column(Float, nullable=True)
    classification_reason = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(
        String,
        default="pending",
        nullable=False,
    )  # pending, approved, rejected, auto_dismissed

    # Relationships
    competitor = relationship("Competitor", back_populates="alerts")
    plan_mapping = relationship("PlanMapping", back_populates="alerts")
    monitoring_run = relationship("MonitoringRun", back_populates="alerts")
    previous_observation = relationship(
        "PriceObservation",
        foreign_keys=[previous_observation_id],
    )
    current_observation = relationship(
        "PriceObservation",
        foreign_keys=[current_observation_id],
    )
    approval_actions = relationship(
        "ApprovalAction",
        back_populates="alert",
        cascade="all, delete-orphan",
    )
    evidence_records = relationship(
        "EvidenceRecord",
        back_populates="alert",
        cascade="all, delete-orphan",
    )


# Alias for backward compatibility if any legacy code imports Alert
Alert = PriceChangeAlert


class ApprovalAction(Base):
    """Human-in-the-loop approval record for updating internal price sheet."""
    __tablename__ = "approval_actions"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("price_change_alerts.id"), nullable=False, index=True)
    action_type = Column(String, default="approve", nullable=False)  # approve, reject
    status = Column(String, default="pending", nullable=False)  # pending, executed, rejected, failed
    idempotency_key = Column(String, unique=True, index=True, nullable=True)
    proposed_price = Column(Float, nullable=True)
    proposed_currency = Column(String, nullable=True)
    proposed_billing = Column(String, nullable=True)
    previous_sheet_price = Column(Float, nullable=True)
    previous_sheet_currency = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String, default="admin", nullable=True)
    reason = Column(Text, nullable=True)
    execution_status = Column(String, default="pending", nullable=False)  # pending, success, failed, already_applied
    executed_at = Column(DateTime, nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Relationships
    alert = relationship("PriceChangeAlert", back_populates="approval_actions")
    internal_sheet_entries = relationship("InternalSheetEntry", back_populates="approval_action")


class InternalSheetEntry(Base):
    """Verified master internal pricing sheet entry for competitor benchmarks."""
    __tablename__ = "internal_sheet_entries"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True, index=True)
    competitor_name = Column(String, nullable=False)
    plan_name = Column(String, nullable=False)
    price_amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    billing_period = Column(String, nullable=True)
    source_url = Column(String, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, nullable=False)
    approval_id = Column(Integer, ForeignKey("approval_actions.id"), nullable=True, index=True)
    update_count = Column(Integer, default=1, nullable=False)

    # Relationships
    competitor = relationship("Competitor", back_populates="sheet_entries")
    plan_mapping = relationship("PlanMapping", back_populates="sheet_entries")
    approval_action = relationship("ApprovalAction", back_populates="internal_sheet_entries")


class EvidenceRecord(Base):
    """Detailed audit snapshot preserving observations, diffs, and proof."""
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("price_change_alerts.id"), nullable=True, index=True)
    observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=True, index=True)
    source_url = Column(String, nullable=False)
    screenshot_path = Column(String, nullable=True)
    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_data_json = Column(Text, nullable=True)
    current_data_json = Column(Text, nullable=True)
    diff_json = Column(Text, nullable=True)
    comparison_reason = Column(Text, nullable=True)

    # Relationships
    alert = relationship("PriceChangeAlert", back_populates="evidence_records")
    observation = relationship("PriceObservation", back_populates="evidence_records")


class TestRun(Base):
    """Execution result record for the four official test cases."""
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(String, index=True, nullable=False)  # TC1, TC2, TC3, TC4
    test_name = Column(String, nullable=False)
    input_json = Column(Text, nullable=False)
    expected_result_json = Column(Text, nullable=False)
    actual_result_json = Column(Text, nullable=False)
    passed = Column(Boolean, nullable=False)
    evidence_path = Column(String, nullable=True)
    screenshot_path = Column(String, nullable=True)
    diff_json = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    ran_at = Column(DateTime, default=datetime.utcnow, nullable=False)

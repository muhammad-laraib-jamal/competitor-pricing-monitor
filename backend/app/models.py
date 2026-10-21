# backend/app/models.py

"""SQLAlchemy models for the Competitor Pricing Monitor MVP.
Only essential entities are defined to satisfy the four official test cases.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    price_page_url = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    observations = relationship("PriceObservation", back_populates="competitor", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="competitor", cascade="all, delete-orphan")

class PlanMapping(Base):
    __tablename__ = "plan_mappings"
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    raw_plan_name = Column(String, nullable=False)
    canonical_name = Column(String, nullable=False)
    billing_period = Column(String, nullable=True)  # e.g., "monthly", "annual"
    currency = Column(String, nullable=True)  # ISO code like "USD", "INR"
    created_at = Column(DateTime, default=datetime.utcnow)

    competitor = relationship("Competitor", backref="plan_mappings")

class PriceObservation(Base):
    __tablename__ = "price_observations"
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True)
    raw_plan_name = Column(String, nullable=False)
    raw_price_text = Column(String, nullable=True)
    price_amount = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    billing_period = Column(String, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="fetched")  # fetched, unavailable, error
    evidence_screenshot_path = Column(String, nullable=True)
    source_url = Column(String, nullable=False)

    competitor = relationship("Competitor", back_populates="observations")
    plan_mapping = relationship("PlanMapping")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True)
    previous_observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=True)
    current_observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=False)
    change_type = Column(String)  # "price_change", "currency_change", "unavailable", etc.
    percentage_change = Column(Float, nullable=True)
    absolute_change = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved = Column(Boolean, default=False)
    rejected = Column(Boolean, default=False)

    competitor = relationship("Competitor", back_populates="alerts")
    plan_mapping = relationship("PlanMapping")
    previous_observation = relationship("PriceObservation", foreign_keys=[previous_observation_id])
    current_observation = relationship("PriceObservation", foreign_keys=[current_observation_id])

class InternalSheetEntry(Base):
    __tablename__ = "internal_sheet"
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    plan_mapping_id = Column(Integer, ForeignKey("plan_mappings.id"), nullable=True)
    price_amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    billing_period = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)
    source_url = Column(String, nullable=False)

    competitor = relationship("Competitor")
    plan_mapping = relationship("PlanMapping")

class ApprovalAction(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    approved = Column(Boolean, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text, nullable=True)

    alert = relationship("Alert")

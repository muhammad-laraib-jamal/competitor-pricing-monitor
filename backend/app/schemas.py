# backend/app/schemas.py

"""Pydantic schemas for API request/response models.
Only essential fields are defined for the MVP.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, Field

class CompetitorBase(BaseModel):
    name: str = Field(..., example="Competitor A")
    price_page_url: HttpUrl = Field(..., example="https://example.com/pricing")
    enabled: Optional[bool] = True

class CompetitorCreate(CompetitorBase):
    pass

class CompetitorUpdate(BaseModel):
    name: Optional[str]
    price_page_url: Optional[HttpUrl]
    enabled: Optional[bool]

class CompetitorOut(CompetitorBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class AlertOut(BaseModel):
    id: int
    competitor_id: int
    plan_mapping_id: Optional[int]
    change_type: str
    percentage_change: Optional[float]
    absolute_change: Optional[float]
    created_at: datetime
    approved: bool
    rejected: bool

    class Config:
        orm_mode = True

# Additional schemas can be added as needed.

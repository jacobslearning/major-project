from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IncidentCreate(BaseModel):
    title: str
    type: Optional[str] = None
    severity: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None

class IncidentResponse(BaseModel):
    incident_id: int
    title: str
    type: Optional[str] = None
    severity: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None

    class Config:
        orm_mode = True  # FastAPI converts models to JSON

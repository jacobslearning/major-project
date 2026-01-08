from pydantic import BaseModel
from datetime import datetime

class IncidentCreate(BaseModel):
    title: str
    type: str
    severity: str
    country: str
    city: str
    latitude: float
    longitude: float
    date_occurred: datetime
    source_url: str

class IncidentResponse(BaseModel):
    incident_id: int
    title: str
    type: str
    severity: str
    country: str
    city: str
    latitude: float
    longitude: float
    date_occurred: datetime
    source_url: str

    class Config:
        orm_mode = True # FastAPI to convert models into JSON

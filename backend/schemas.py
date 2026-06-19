from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class RoleCreate(BaseModel):
    role_name: str
    description: Optional[str] = None


class RoleResponse(RoleCreate):
    role_id: int

    model_config = {"from_attributes": True}


class IncidentTypeCreate(BaseModel):
    type: str
    description: Optional[str] = None


class IncidentTypeResponse(IncidentTypeCreate):
    incident_type_id: int

    model_config = {"from_attributes": True}


class SourceCreate(BaseModel):
    source_name: str
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    update_frequency: Optional[str] = None
    reliability_notes: Optional[str] = None
    reliability_score: Optional[int] = None


class SourceResponse(SourceCreate):
    source_id: int

    model_config = {"from_attributes": True}


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    incident_type_id: Optional[int] = None
    source_id: Optional[int] = None
    incident_date: Optional[datetime] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: Optional[str] = None
    type: Optional[str] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type_id: Optional[int] = None
    source_id: Optional[int] = None
    incident_date: Optional[datetime] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: Optional[str] = None
    type: Optional[str] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: int
    title: str
    description: Optional[str] = None
    incident_type_id: Optional[int] = None
    source_id: Optional[int] = None
    incident_date: Optional[datetime] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    type: Optional[str] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None
    incident_type: Optional[IncidentTypeResponse] = None
    source: Optional[SourceResponse] = None
    type: Optional[str] = None
    date_occurred: Optional[datetime] = None
    source_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role_id: Optional[int] = None


class UserResponse(BaseModel):
    user_id: int
    id: int
    username: str
    email: str
    role_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None

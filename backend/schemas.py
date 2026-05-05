from pydantic import BaseModel,EmailStr
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

    model_config = {"from_attributes": True}
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
 
 
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    model_config = {"from_attributes": True}
 
 
class Token(BaseModel):
    access_token: str
    token_type: str
 
 
class TokenData(BaseModel):
    username: Optional[str] = None

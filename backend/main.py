from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os

from database import engine, Base
from models import Incident, User
from schemas import (
    IncidentCreate,
    IncidentResponse,
    UserCreate,
    UserResponse,
    Token,
)
from auth import (
    get_db,
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Overseas Incident Backend")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.7.214:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/incidents/", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    db_incident = Incident(**incident.dict())
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident


# all incidents


@app.get("/incidents/", response_model=List[IncidentResponse])
def list_incidents(
    start_date: Optional[datetime] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[datetime] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Incident)

    if start_date and end_date:
        query = query.filter(Incident.date_occurred.between(start_date, end_date))
    elif start_date:
        query = query.filter(Incident.date_occurred >= start_date)
    elif end_date:
        query = query.filter(Incident.date_occurred <= end_date)

    return query.all()


@app.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.put("/incidents/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    updated: IncidentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    for key, value in updated.dict().items():
        setattr(incident, key, value)

    db.commit()
    db.refresh(incident)
    return incident


@app.delete("/incidents/{incident_id}")
def delete_incident(
    incident_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"Info": f"Incident {incident_id} deleted"}


@app.get("/daily-brief")
def get_daily_brief():
    file_path = os.path.join("data", "DailyBrief.xml")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="DailyBrief.xml not found")

    return FileResponse(
        path=file_path, media_type="application/rss+xml", filename="DailyBrief.xml"
    )

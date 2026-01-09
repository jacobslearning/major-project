from fastapi import FastAPI, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, engine, Base
from models import Incident
from schemas import IncidentCreate, IncidentResponse
from typing import List, Optional
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Overseas Incident Backend")

origins = [
    "http://localhost:3000",   # your React frontend
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],         # allow GET, POST, PUT, DELETE
    allow_headers=["*"],         # allow all headers
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/incidents/", response_model=IncidentResponse)
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
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
def update_incident(incident_id: int, updated: IncidentCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    for key, value in updated.dict().items():
        setattr(incident, key, value)
    
    db.commit()
    db.refresh(incident)
    return incident

@app.delete("/incidents/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"Info": f"Incident {incident_id} deleted"}

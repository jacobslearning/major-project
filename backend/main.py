from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Incident
from schemas import IncidentCreate, IncidentResponse
from typing import List

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Overseas Incident Backend")

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
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).all()

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

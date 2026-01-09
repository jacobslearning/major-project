from sqlalchemy import Column, Integer, String,Text, Float, DateTime
from database import Base

class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    type = Column(String)
    severity = Column(String)
    country = Column(String)
    city = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    date_occurred = Column(DateTime)
    source_url = Column(String)

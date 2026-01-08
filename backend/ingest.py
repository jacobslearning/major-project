# ingest.py

import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Incident
from datetime import datetime

def load_dataset(file_path: str) -> pd.DataFrame:
    """
    Load earthquake dataset from TSV and preprocess it.
    """
    df = pd.read_csv(file_path, sep='\t', comment='#', dtype=str)

    # Convert date columns
    df['from_date'] = pd.to_datetime(df.get('from_date'), errors='coerce', utc=True)
    df['to_date'] = pd.to_datetime(df.get('to_date'), errors='coerce', utc=True)

    # Convert numeric columns
    df['geo_lat'] = pd.to_numeric(df.get('geo_lat'), errors='coerce')
    df['geo_long'] = pd.to_numeric(df.get('geo_long'), errors='coerce')
    df['severity_value'] = pd.to_numeric(df.get('severity_value'), errors='coerce')

    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].str.strip()

    return df

def map_earthquake_row_to_incident(row: pd.Series) -> Incident:
    """
    Map a row to an Incident
    """
    severity = None
    if row.get('severity_value'):
        severity = f"{row.get('severity_unit')} {row.get('severity_value')}"

    return Incident(
        title=row.get('title'),
        type=row.get('event_type'),
        severity=severity,
        country=row.get('country'),
        city=None,
        latitude=row.get('geo_lat'),
        longitude=row.get('geo_long'),
        date_occurred=row.get('from_date'),
        source_url=row.get('link')
    )

def ingest_to_db(file_path: str, mapper_func):
    """
    Generic ingestion function for any dataset using a mapper.
    """
    df = load_dataset(file_path)
    session: Session = SessionLocal()

    try:
        for _, row in df.iterrows():
            incident = mapper_func(row)
            session.add(incident)
        session.commit()
        print(f"Successfully ingested {len(df)} records.")
    except Exception as e:
        session.rollback()
        print("Error during ingestion:", e)
    finally:
        session.close()

if __name__ == "__main__":
    dataset_path = "data/gdacs_rss_information.csv" 
import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Incident
import math
import re

def safe_float(value):
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value

def strip_leading_date(text: str) -> str:
    if not text:
        return text
    return re.sub(r'^\d{1,2}/\d{1,2}/\d{4}:\s*', '', text)

def load_terrorism_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_excel(file_path, dtype=str)

    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    if {'date_year', 'date_month', 'date_day'}.issubset(df.columns):
        df['event_date'] = pd.to_datetime(
            df[['date_year', 'date_month', 'date_day']]
                .rename(columns={
                    'date_year': 'year',
                    'date_month': 'month',
                    'date_day': 'day'
                }),
            errors='coerce'
        )
    else:
        df['event_date'] = pd.to_datetime(df.get('event_date'), errors='coerce')

    for col in ['latitude', 'longitude', 'killed_low', 'killed_high']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].str.strip()

    df = df.dropna(subset=['summary', 'latitude', 'longitude'])

    return df

def load_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_csv(file_path, dtype=str)
    df = df[~df['title'].str.startswith('#', na=False)]
    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    df['from_date'] = pd.to_datetime(df.get('from_date'), errors='coerce', utc=True)
    df['to_date'] = pd.to_datetime(df.get('to_date'), errors='coerce', utc=True)

    df['geo_lat'] = pd.to_numeric(df.get('geo_lat'), errors='coerce')
    df['geo_long'] = pd.to_numeric(df.get('geo_long'), errors='coerce')
    df['severity_value'] = pd.to_numeric(df.get('severity_value'), errors='coerce')

    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].str.strip()
    df = df.dropna(subset=['title'])
    return df

def map_terrorism_row_to_incident(row: pd.Series) -> Incident:
    killed_low = row.get('killed_low') or 0
    killed_high = row.get('killed_high') or killed_low
    wounded_low = row.get('wounded_low') or 0
    wounded_high = row.get('wounded_high') or wounded_low

    severity = f"Killed {int(killed_low)}–{int(killed_high)}, Wounded {int(wounded_low)}–{int(wounded_high)}"

    summary = strip_leading_date(row.get('summary') or "")

    # type of attack
    weapon = (row.get('weapon_txt') or "").lower()
    ct_car_bomb = row.get('ct_car_bomb')
    ct_truck_bomb = row.get('ct_truck_bomb')
    ct_belt_bomb = row.get('ct_belt_bomb')

    attack_type = "Terrorist Attack"

    if ct_car_bomb == 1 or "car bomb" in weapon:
        attack_type = "Terrorist Attack: Car Bomb"
    elif ct_truck_bomb == 1 or "truck bomb" in weapon:
        attack_type = "Terrorist Attack: Truck Bomb"
    elif ct_belt_bomb == 1 or "suicide" in weapon or "vbied" in weapon:
        attack_type = "Terrorist Attack: Suicide Bombing"
    elif "firearm" in weapon or "gun" in weapon:
        attack_type = "Terrorist Attack: Armed Attack"
    elif weapon:
        attack_type = f"Terrorist Attack: {weapon.title()}" 

    return Incident(
        title=summary,
        type=attack_type,
        severity=severity,
        country=row.get('admin0_txt'),
        city=row.get('city_txt'),
        latitude=row.get('latitude'),
        longitude=row.get('longitude'),
        date_occurred=row.get('event_date'),
        source_url="https://subjectguides.library.american.edu/c.php?g=478725&p=3273238"
    )


def map_earthquake_row_to_incident(row: pd.Series) -> Incident:
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

def ingest_to_db(file_path: str, loader_func, mapper_func):
    df = loader_func(file_path)
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
    ingest_to_db("data/gdacs_rss_information.csv",load_dataset,map_earthquake_row_to_incident)
    ingest_to_db("data/dsat_dist_2020_10.xlsx",load_terrorism_dataset,map_terrorism_row_to_incident)
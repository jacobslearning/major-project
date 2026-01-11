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

def safe_int(value):
    try:
        if pd.isna(value):
            return 0
        return int(float(value))
    except (ValueError, TypeError):
        return 0

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

def load_event1pd_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_csv(file_path, dtype=str)
    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    df['latitude'] = pd.to_numeric(df.get('latitude'), errors='coerce')
    df['longitude'] = pd.to_numeric(df.get('longitude'), errors='coerce')

    int_cols = ['n_reports', 't_mil_b', 'a_rus_b', 'a_ukr_b', 'a_civ_b', 'a_other_b',
                't_airstrike_b', 't_airalert_b', 't_uav_b', 't_artillery_b', 't_firefight_b',
                't_raid_b', 't_occupy_b', 't_armor_b', 't_arrest_b', 't_ied_b', 't_cyber_b',
                't_hospital_b', 't_milcas_b', 't_civcas_b', 't_retreat_b', 't_loc_b', 't_san_b',
                't_property_b', 't_control_b', 't_aad_b']

    for col in int_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

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

def map_event1pd_row_to_incident(row: pd.Series) -> Incident:
    type_priority = [
        ('Air Strike', 't_airstrike_b'),
        ('Air Alert', 't_airalert_b'),
        ('UAV Attack', 't_uav_b'),
        ('Artillery Strike', 't_artillery_b'),
        ('Firefight', 't_firefight_b'),
        ('Raid', 't_raid_b'),
        ('Occupation', 't_occupy_b'),
        ('Armor Engagement', 't_armor_b'),
        ('Arrest', 't_arrest_b'),
        ('IED', 't_ied_b'),
        ('Cyber Attack', 't_cyber_b'),
        ('Hospital Attack', 't_hospital_b'),
        ('Military Casualty', 't_milcas_b'),
        ('Civilian Casualty', 't_civcas_b'),
        ('Retreat', 't_retreat_b'),
        ('Sanctions', 't_san_b'),
        ('Property Damage', 't_property_b'),
        ('Control', 't_control_b'),
        ('Loc Ops', 't_loc_b')
    ]

    selected_type = "Other Event"
    for label, col in type_priority:
        if safe_int(row.get(col)) > 0:
            selected_type = label
            break

    severity_parts = []
    if safe_int(row.get('t_mil_b')): severity_parts.append(f"Military {safe_int(row.get('t_mil_b'))}")
    if safe_int(row.get('a_rus_b')): severity_parts.append(f"Russian {safe_int(row.get('a_rus_b'))}")
    if safe_int(row.get('a_ukr_b')): severity_parts.append(f"Ukrainian {safe_int(row.get('a_ukr_b'))}")
    if safe_int(row.get('a_civ_b')): severity_parts.append(f"Civilians {safe_int(row.get('a_civ_b'))}")
    if safe_int(row.get('a_other_b')): severity_parts.append(f"Other {safe_int(row.get('a_other_b'))}")
    severity = ", ".join(severity_parts) if severity_parts else None

    event_date = pd.to_datetime(str(row.get('date')), format='%Y%m%d', errors='coerce')
    n_reports = safe_int(row.get('n_reports'))

    location_info = f"{row.get('asciiname')}, {row.get('ADM1_NAME')}"
    title = f"{selected_type} at {location_info} (Times Reported: {n_reports})"
    return Incident(
        title=title,
        type=selected_type,
        severity=severity,
        country="Ukraine",
        city=str(row.get('ADM2_NAME')),
        latitude=safe_float(row.get('latitude')),
        longitude=safe_float(row.get('longitude')),
        date_occurred=event_date,
        source_url=row.get('sources')
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
   # ingest_to_db("data/gdacs_rss_information.csv",load_dataset,map_earthquake_row_to_incident)
    #ingest_to_db("data/dsat_dist_2020_10.xlsx",load_terrorism_dataset,map_terrorism_row_to_incident)
    ingest_to_db("data/event_1pd_latest_2025.csv", load_event1pd_dataset, map_event1pd_row_to_incident)
    ingest_to_db("data/event_1pd_latest_2026.csv", load_event1pd_dataset, map_event1pd_row_to_incident)
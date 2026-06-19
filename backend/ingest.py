import math
import re
from typing import Any, Callable, Optional
from urllib.parse import urlparse

import pandas as pd
from sqlalchemy.orm import Session

from auth import hash_password
from database import SessionLocal
from models import Incident, IncidentType, Role, Source, User


IncidentPayload = dict[str, Any]


def is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def safe_text(value: Any) -> Optional[str]:
    if is_missing(value):
        return None
    text = str(value).strip()
    return text or None


def safe_float(value: Any) -> Optional[float]:
    if is_missing(value):
        return None
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def safe_int(value: Any) -> int:
    if is_missing(value):
        return 0
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def safe_datetime(value: Any):
    if is_missing(value):
        return None
    dt = pd.to_datetime(value, errors="coerce")
    if pd.isna(dt):
        return None
    if hasattr(dt, "to_pydatetime"):
        return dt.to_pydatetime()
    return dt


def strip_leading_date(text: str) -> str:
    if not text:
        return text
    return re.sub(r"^\d{1,2}/\d{1,2}/\d{4}:\s*", "", text)


def strip_string_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.select_dtypes(include=["object", "string"]).columns:
        df[col] = df[col].map(lambda value: value.strip() if isinstance(value, str) else value)
    return df


def source_name_from_url(source_url: Optional[str], fallback: str) -> str:
    if not source_url:
        return fallback
    parsed = urlparse(source_url)
    if parsed.netloc:
        return parsed.netloc
    return fallback


def join_description_parts(*parts: Optional[str]) -> Optional[str]:
    clean_parts = [part for part in parts if part]
    return "\n".join(clean_parts) if clean_parts else None


def get_or_create_incident_type(
    session: Session, type_name: Optional[str], description: Optional[str] = None
) -> IncidentType:
    clean_type = safe_text(type_name) or "N/A"

    incident_type = (
        session.query(IncidentType).filter(IncidentType.type == clean_type).one_or_none()
    )
    if incident_type:
        if description and not incident_type.description:
            incident_type.description = description
        return incident_type

    incident_type = IncidentType(type=clean_type, description=description)
    session.add(incident_type)
    session.flush()
    return incident_type


def get_or_create_source(
    session: Session,
    *,
    source_name: Optional[str],
    source_type: Optional[str] = None,
    source_url: Optional[str] = None,
    update_frequency: Optional[str] = None,
    reliability_notes: Optional[str] = None,
    reliability_score: Optional[int] = None,
) -> Source:
    clean_url = safe_text(source_url)
    clean_name = safe_text(source_name) or source_name_from_url(clean_url, "N/A")
    clean_type = safe_text(source_type)

    query = session.query(Source)
    if clean_url:
        source = query.filter(Source.source_url == clean_url).one_or_none()
    else:
        source = query.filter(Source.source_name == clean_name).one_or_none()

    if source:
        if clean_type and not source.source_type:
            source.source_type = clean_type
        if update_frequency and not source.update_frequency:
            source.update_frequency = update_frequency
        if reliability_notes and not source.reliability_notes:
            source.reliability_notes = reliability_notes
        if reliability_score is not None and source.reliability_score is None:
            source.reliability_score = reliability_score
        return source

    source = Source(
        source_name=clean_name,
        source_type=clean_type,
        source_url=clean_url,
        update_frequency=update_frequency,
        reliability_notes=reliability_notes,
        reliability_score=reliability_score,
    )
    session.add(source)
    session.flush()
    return source


def incident_exists(session: Session, incident_data: dict[str, Any]) -> bool:
    query = session.query(Incident).filter(Incident.title == incident_data["title"])

    incident_date = incident_data.get("incident_date")
    if incident_date is None:
        query = query.filter(Incident.incident_date.is_(None))
    else:
        query = query.filter(Incident.incident_date == incident_date)

    source_id = incident_data.get("source_id")
    if source_id is None:
        query = query.filter(Incident.source_id.is_(None))
    else:
        query = query.filter(Incident.source_id == source_id)

    return query.first() is not None


def persist_incident_payload(
    session: Session, payload: IncidentPayload, *, dedupe: bool = True
) -> Optional[Incident]:
    incident_type = get_or_create_incident_type(
        session,
        payload.get("incident_type"),
        payload.get("incident_type_description"),
    )

    source_payload = payload.get("source") or {}
    source = get_or_create_source(session, **source_payload) if source_payload else None

    title = safe_text(payload.get("title")) or "N/A"

    incident_data = {
        "title": title,
        "description": safe_text(payload.get("description")),
        "incident_type_id": incident_type.incident_type_id,
        "source_id": source.source_id if source else None,
        "incident_date": safe_datetime(payload.get("incident_date")),
        "country": safe_text(payload.get("country")),
        "latitude": safe_float(payload.get("latitude")),
        "longitude": safe_float(payload.get("longitude")),
        "severity": safe_text(payload.get("severity")),
    }

    if dedupe and incident_exists(session, incident_data):
        return None

    incident = Incident(**incident_data)
    session.add(incident)
    return incident


def load_terrorism_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_excel(file_path, dtype=str)

    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    if {"date_year", "date_month", "date_day"}.issubset(df.columns):
        df["event_date"] = pd.to_datetime(
            df[["date_year", "date_month", "date_day"]].rename(
                columns={"date_year": "year", "date_month": "month", "date_day": "day"}
            ),
            errors="coerce",
        )
    else:
        df["event_date"] = pd.to_datetime(df.get("event_date"), errors="coerce")

    for col in ["latitude", "longitude", "killed_low", "killed_high", "wounded_low", "wounded_high"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = strip_string_columns(df)
    df = df.dropna(subset=["summary", "latitude", "longitude"])

    return df


def load_event1pd_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_csv(file_path, dtype=str)
    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    df["latitude"] = pd.to_numeric(df.get("latitude"), errors="coerce")
    df["longitude"] = pd.to_numeric(df.get("longitude"), errors="coerce")

    int_cols = [
        "n_reports",
        "t_mil_b",
        "a_rus_b",
        "a_ukr_b",
        "a_civ_b",
        "a_other_b",
        "t_airstrike_b",
        "t_airalert_b",
        "t_uav_b",
        "t_artillery_b",
        "t_firefight_b",
        "t_raid_b",
        "t_occupy_b",
        "t_armor_b",
        "t_arrest_b",
        "t_ied_b",
        "t_cyber_b",
        "t_hospital_b",
        "t_milcas_b",
        "t_civcas_b",
        "t_retreat_b",
        "t_loc_b",
        "t_san_b",
        "t_property_b",
        "t_control_b",
        "t_aad_b",
    ]

    for col in int_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    return strip_string_columns(df)


def load_dataset(file_path: str) -> pd.DataFrame:
    df = pd.read_csv(file_path, dtype=str)
    df = df[~df["title"].str.startswith("#", na=False)]
    print("Columns found:", df.columns.tolist())
    print("First rows:", df.head())

    df["from_date"] = pd.to_datetime(df.get("from_date"), errors="coerce", utc=True)
    df["to_date"] = pd.to_datetime(df.get("to_date"), errors="coerce", utc=True)

    df["geo_lat"] = pd.to_numeric(df.get("geo_lat"), errors="coerce")
    df["geo_long"] = pd.to_numeric(df.get("geo_long"), errors="coerce")
    df["severity_value"] = pd.to_numeric(df.get("severity_value"), errors="coerce")

    df = strip_string_columns(df)
    df = df.dropna(subset=["title"])
    return df


def map_terrorism_row_to_incident(row: pd.Series) -> IncidentPayload:
    killed_low = safe_int(row.get("killed_low"))
    killed_high = safe_int(row.get("killed_high")) or killed_low
    wounded_low = safe_int(row.get("wounded_low"))
    wounded_high = safe_int(row.get("wounded_high")) or wounded_low

    severity = f"Killed {killed_low}-{killed_high}, Wounded {wounded_low}-{wounded_high}"

    summary = strip_leading_date(safe_text(row.get("summary")) or "")

    weapon = (safe_text(row.get("weapon_txt")) or "").lower()
    ct_car_bomb = safe_int(row.get("ct_car_bomb"))
    ct_truck_bomb = safe_int(row.get("ct_truck_bomb"))
    ct_belt_bomb = safe_int(row.get("ct_belt_bomb"))

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

    city = safe_text(row.get("city_txt"))
    description = join_description_parts(
        summary,
        f"City: {city}" if city else None,
        f"Weapon: {weapon}" if weapon else None,
    )

    return {
        "title": summary or attack_type,
        "description": description,
        "incident_type": attack_type,
        "incident_type_description": "Terrorism incident category derived from DSAT.",
        "severity": severity,
        "country": safe_text(row.get("admin0_txt")),
        "latitude": safe_float(row.get("latitude")),
        "longitude": safe_float(row.get("longitude")),
        "incident_date": safe_datetime(row.get("event_date")),
        "source": {
            "source_name": "DSAT Terrorism Dataset",
            "source_type": "dataset",
            "source_url": "https://cpost.uchicago.edu/research/suicide_attacks/database_on_suicide_attacks/",
            "update_frequency": "N/A",
            "reliability_notes": "Historical dataset from 1982 through to 2019.",
            "reliability_score": 90,
        },
    }


def map_earthquake_row_to_incident(row: pd.Series) -> IncidentPayload:
    severity = None
    severity_value = safe_float(row.get("severity_value"))
    severity_unit = safe_text(row.get("severity_unit"))
    if severity_value is not None:
        severity = f"{severity_unit or ''} {severity_value}".strip()

    event_type = safe_text(row.get("event_type")) or "Natural Disaster"

    return {
        "title": safe_text(row.get("title")) or event_type,
        "description": safe_text(row.get("description")),
        "incident_type": event_type,
        "incident_type_description": "GDACS event type",
        "severity": severity,
        "country": safe_text(row.get("country")),
        "latitude": safe_float(row.get("geo_lat")),
        "longitude": safe_float(row.get("geo_long")),
        "incident_date": safe_datetime(row.get("from_date")),
        "source": {
            "source_name": "GDACS",
            "source_type": "rss",
            "source_url": "https://gdacs.org",
            "update_frequency": "Hourly",
            "reliability_notes": None,
            "reliability_score": 80,
        },
    }


def map_event1pd_row_to_incident(row: pd.Series) -> IncidentPayload:
    type_priority = [
        ("Air Strike", "t_airstrike_b"),
        ("Air Alert", "t_airalert_b"),
        ("UAV Attack", "t_uav_b"),
        ("Artillery Strike", "t_artillery_b"),
        ("Firefight", "t_firefight_b"),
        ("Raid", "t_raid_b"),
        ("Occupation", "t_occupy_b"),
        ("Armor Engagement", "t_armor_b"),
        ("Arrest", "t_arrest_b"),
        ("IED", "t_ied_b"),
        ("Cyber Attack", "t_cyber_b"),
        ("Hospital Attack", "t_hospital_b"),
        ("Military Casualty", "t_milcas_b"),
        ("Civilian Casualty", "t_civcas_b"),
        ("Retreat", "t_retreat_b"),
        ("Sanctions", "t_san_b"),
        ("Property Damage", "t_property_b"),
        ("Control", "t_control_b"),
        ("Loc Ops", "t_loc_b"),
    ]

    selected_type = "Other Event"
    for label, col in type_priority:
        if safe_int(row.get(col)) > 0:
            selected_type = label
            break

    severity_parts = []
    if safe_int(row.get("t_mil_b")):
        severity_parts.append(f"Military {safe_int(row.get('t_mil_b'))}")
    if safe_int(row.get("a_rus_b")):
        severity_parts.append(f"Russian {safe_int(row.get('a_rus_b'))}")
    if safe_int(row.get("a_ukr_b")):
        severity_parts.append(f"Ukrainian {safe_int(row.get('a_ukr_b'))}")
    if safe_int(row.get("a_civ_b")):
        severity_parts.append(f"Civilians {safe_int(row.get('a_civ_b'))}")
    if safe_int(row.get("a_other_b")):
        severity_parts.append(f"Other {safe_int(row.get('a_other_b'))}")
    severity = ", ".join(severity_parts) if severity_parts else None

    event_date = pd.to_datetime(str(row.get("date")), format="%Y%m%d", errors="coerce")
    n_reports = safe_int(row.get("n_reports"))

    city = safe_text(row.get("ADM2_NAME"))
    location_info = ", ".join(
        part for part in [safe_text(row.get("asciiname")), safe_text(row.get("ADM1_NAME"))] if part
    )
    title_location = location_info or "N/A"
    title = f"{selected_type} at {title_location} (Times Reported: {n_reports})"

    source_reference = safe_text(row.get("sources"))
    description = join_description_parts(
        f"Location: {title_location}",
        f"City: {city}" if city else None,
        f"Reports: {n_reports}" if n_reports else None,
        f"Original Sources: {source_reference}" if source_reference else None,
    )

    return {
        "title": title,
        "description": description,
        "incident_type": selected_type,
        "incident_type_description": "VIINA event type",
        "severity": severity,
        "country": "Ukraine",
        "latitude": safe_float(row.get("latitude")),
        "longitude": safe_float(row.get("longitude")),
        "incident_date": safe_datetime(event_date),
        "source": {
            "source_name": "VIINA",
            "source_type": "dataset",
            "source_url": "https://github.com/zhukovyuri/VIINA",
            "update_frequency": "Daily",
            "reliability_notes": "Deconflicts incident reports from Ukrainan and Russian sources.",
            "reliability_score": 80,
        },
    }



def ingest_to_db(
    file_path: str,
    loader_func: Callable[[str], pd.DataFrame],
    mapper_func: Callable[[pd.Series], IncidentPayload],
    *,
    dedupe: bool = True,
    commit_every: int = 500,
) -> None:
    df = loader_func(file_path)
    session: Session = SessionLocal()

    created_count = 0
    skipped_count = 0

    try:
        for index, row in df.iterrows():
            payload = mapper_func(row)
            incident = persist_incident_payload(session, payload, dedupe=dedupe)

            if incident is None:
                skipped_count += 1
            else:
                created_count += 1

            if created_count and created_count % commit_every == 0:
                session.commit()
                print(f"Committed {created_count} records from {file_path}...")

        session.commit()
        print(
            f"Successfully ingested {created_count} new records from {file_path}. "
            f"Skipped {skipped_count} duplicates."
        )
    except Exception as e:
        session.rollback()
        print(f"Error during ingestion at row {index} from {file_path}:", e)
        raise
    finally:
        session.close()

def get_or_create_role(
    session: Session,
    role_name: str,
    description: Optional[str] = None,
) -> Role:
    role = session.query(Role).filter(Role.role_name == role_name).one_or_none()

    if role:
        if description and not role.description:
            role.description = description
        return role

    role = Role(role_name=role_name, description=description)
    session.add(role)
    session.flush()
    return role


def create_administrator_user() -> None:

    session: Session = SessionLocal()

    try:
        administrator_role = get_or_create_role(
            session,
            "administrator",
            "Administrator role with full user and system management access.",
        )

        get_or_create_role(
            session,
            "analyst",
            "Default analyst role for standard users.",
        )

        existing_user = (
            session.query(User)
            .filter((User.username == "admin") | (User.email == "admin@gmail.com"))
            .one_or_none()
        )

        if existing_user:
            existing_user.role_id = administrator_role.role_id
            existing_user.is_active = True
            session.commit()
            return

        admin_user = User(
            username="admin",
            email="admin@gmail.com",
            password_hash=hash_password("Admin1!@"),
            role_id=administrator_role.role_id,
            is_active=True,
        )

        session.add(admin_user)
        session.commit()

        print("Created administrator account:")
        print(f"  username: admin")
        print(f"  email:    admin@gmail.com")
        print(f"  password: Admin1!@")

    except Exception as e:
        session.rollback()
        print("Error creating administrator account:", e)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    create_administrator_user()
    ingest_to_db(
        "data/gdacs_rss_information.csv", load_dataset, map_earthquake_row_to_incident
    )
    ingest_to_db(
        "data/dsat_dist_2020_10.xlsx",
        load_terrorism_dataset,
        map_terrorism_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2025.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_jan.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_feb.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_mar.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_apr.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_may.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )
    ingest_to_db(
        "data/event_1pd_latest_2026_jun.csv",
        load_event1pd_dataset,
        map_event1pd_row_to_incident,
    )

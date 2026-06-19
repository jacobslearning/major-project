from datetime import datetime

from models import Incident, IncidentType, Source

def get_or_create_test_incident_type(session):
    incident_type = session.query(IncidentType).filter(IncidentType.type == "Test").one_or_none()
    if incident_type:
        return incident_type

    incident_type = IncidentType(type="Test", description="Test incident type")
    session.add(incident_type)
    session.flush()
    return incident_type


def get_or_create_test_source(session):
    source = session.query(Source).filter(Source.source_url == "https://dddd").one_or_none()
    if source:
        return source

    source = Source(
        source_name="Test Feed",
        source_type="test",
        source_url="https://dddd",
        update_frequency="Daily",
        reliability_notes="Test source notes",
        reliability_score=75,
    )
    session.add(source)
    session.flush()
    return source


def add_incident(session, title, occurred_at):
    incident_type = get_or_create_test_incident_type(session)
    source = get_or_create_test_source(session)

    incident = Incident(
        title=title,
        description="Test incident details",
        incident_type_id=incident_type.incident_type_id,
        source_id=source.source_id,
        severity="Low",
        country="UK",
        latitude=51.5074,
        longitude=-0.1278,
        incident_date=occurred_at,
    )
    session.add(incident)
    session.commit()
    session.refresh(incident)
    return incident


def test_get_incidents_date_filters_return_correct_records(client, auth_headers, db_session):
    add_incident(db_session, "Before", datetime(2025, 12, 31, 23, 59, 59))
    add_incident(db_session, "Inside", datetime(2026, 1, 15, 12, 0, 0))
    add_incident(db_session, "After", datetime(2026, 2, 1, 0, 0, 1))

    response = client.get(
        "/incidents/",
        params={
            "start_date": "2026-01-01T00:00:00",
            "end_date": "2026-01-31T23:59:59",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert [incident["title"] for incident in payload] == ["Inside"]

    inside = payload[0]
    assert inside["type"] == "Test"
    assert inside["incident_type"]["type"] == "Test"
    assert inside["source_url"] == "https://dddd"
    assert inside["source"]["source_name"] == "Test Feed"
    assert inside["source"]["reliability_score"] == 75


def test_get_incidents_rejects_missing_token(client):
    response = client.get("/incidents/")

    assert response.status_code == 401


def test_get_incidents_rejects_invalid_date(client, auth_headers):
    response = client.get(
        "/incidents/",
        params={"start_date": "invalid-date"},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_get_incidents_rejects_invalid_token(client):
    response = client.get(
        "/incidents/",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401

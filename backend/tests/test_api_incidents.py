from datetime import datetime

from models import Incident


def add_incident(session, title, occurred_at):
    incident = Incident(
        title=title,
        type="Test",
        severity="Low",
        country="UK",
        city="London",
        latitude=51.5074,
        longitude=-0.1278,
        date_occurred=occurred_at,
        source_url="https://dddd",
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

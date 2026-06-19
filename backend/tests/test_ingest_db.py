from datetime import datetime

import pandas as pd

from ingest import ingest_to_db, map_earthquake_row_to_incident
from models import Incident, IncidentType, Source


def test_ingest_to_db_commits_transformed_incident(db_session):
    def fake_loader(_file_path):
        return pd.DataFrame(
            [
                {
                    "title": "Earthquake report",
                    "event_type": "EQ",
                    "severity_unit": "Magnitude",
                    "severity_value": 5.7,
                    "country": "Japan",
                    "geo_lat": 35.6762,
                    "geo_long": 139.6503,
                    "from_date": datetime(2026, 1, 15, 10, 0, 0),
                    "link": "https://earthquake.com",
                }
            ]
        )

    ingest_to_db("ignored.csv", fake_loader, map_earthquake_row_to_incident)

    incidents = db_session.query(Incident).all()
    assert len(incidents) == 1

    incident = incidents[0]
    assert incident.title == "Earthquake report"
    assert incident.type == "EQ"
    assert incident.incident_type.type == "EQ"
    assert incident.severity == "Magnitude 5.7"
    assert incident.country == "Japan"
    assert incident.latitude == 35.6762
    assert incident.longitude == 139.6503
    assert incident.incident_date == datetime(2026, 1, 15, 10, 0, 0)
    assert incident.source.source_url == "https://gdacs.org"
    assert incident.source.source_type == "rss"
    assert incident.source.update_frequency == "Hourly"
    assert incident.source.reliability_score == 80

    assert db_session.query(IncidentType).filter_by(type="EQ").count() == 1
    assert db_session.query(Source).filter_by(source_url="https://gdacs.org").count() == 1

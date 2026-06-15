from datetime import datetime

import pandas as pd

from ingest import ingest_to_db, map_earthquake_row_to_incident
from models import Incident


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
    assert incidents[0].title == "Earthquake report"
    assert incidents[0].type == "EQ"
    assert incidents[0].severity == "Magnitude 5.7"
    assert incidents[0].latitude == 35.6762
    assert incidents[0].longitude == 139.6503


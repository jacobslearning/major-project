from datetime import datetime

import pandas as pd
import pytest

from ingest import map_event1pd_row_to_incident


def test_event1pd_row_maps_into_normalized_incident_payload():
    row = pd.Series(
        {
            "date": "20260115",
            "n_reports": "4",
            "t_airstrike_b": "1",
            "t_airalert_b": "0",
            "t_uav_b": "0",
            "t_artillery_b": "0",
            "t_firefight_b": "0",
            "t_raid_b": "0",
            "t_occupy_b": "0",
            "t_armor_b": "0",
            "t_arrest_b": "0",
            "t_ied_b": "0",
            "t_cyber_b": "0",
            "t_hospital_b": "0",
            "t_milcas_b": "0",
            "t_civcas_b": "0",
            "t_retreat_b": "0",
            "t_san_b": "0",
            "t_property_b": "0",
            "t_control_b": "0",
            "t_loc_b": "0",
            "t_mil_b": "2",
            "a_rus_b": "1",
            "a_ukr_b": "0",
            "a_civ_b": "3",
            "a_other_b": "0",
            "asciiname": "Kyiv",
            "ADM1_NAME": "Kyiv Oblast",
            "ADM2_NAME": "Kyiv Raion",
            "latitude": 50.4501,
            "longitude": 30.5234,
            "sources": "https://example.test/source",
        }
    )

    payload = map_event1pd_row_to_incident(row)

    assert isinstance(payload, dict)
    assert payload["title"] == "Air Strike at Kyiv, Kyiv Oblast (Times Reported: 4)"
    assert payload["incident_type"] == "Air Strike"
    assert payload["incident_type_description"] == "VIINA event type"
    assert payload["severity"] == "Military 2, Russian 1, Civilians 3"
    assert payload["country"] == "Ukraine"
    assert payload["latitude"] == pytest.approx(50.4501)
    assert payload["longitude"] == pytest.approx(30.5234)
    assert payload["incident_date"] == datetime(2026, 1, 15)
    assert "City: Kyiv Raion" in payload["description"]
    assert "Original sources: https://example.test/source" in payload["description"]

    assert payload["source"] == {
    "source_name": "VIINA",
    "source_type": "dataset",
    "source_url": "https://github.com/zhukovyuri/VIINA",
    "update_frequency": "Daily",
    "reliability_notes": "Deconflicts incident reports from Ukrainan and Russian sources.",
    "reliability_score": 80,
}

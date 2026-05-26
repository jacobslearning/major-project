from datetime import datetime

import pandas as pd
import pytest

from ingest import load_dataset, load_event1pd_dataset, load_terrorism_dataset


def test_terrorism_excel_loader_loads_and_cleans_rows(tmp_path):
    source_file = tmp_path / "terrorism.xlsx"
    pd.DataFrame(
        [
            {
                "summary": "  01/02/2020: Attack near station  ",
                "date_year": "2020",
                "date_month": "1",
                "date_day": "2",
                "latitude": "50.4501",
                "longitude": "30.5234",
                "killed_low": "2",
                "killed_high": "5",
                "admin0_txt": " Ukraine ",
                "city_txt": " Kyiv ",
            },
            {
                "summary": "Missing latitude",
                "date_year": "2020",
                "date_month": "1",
                "date_day": "3",
                "latitude": None,
                "longitude": "30.5234",
            },
        ]
    ).to_excel(source_file, index=False)

    df = load_terrorism_dataset(str(source_file))

    assert len(df) == 1
    row = df.iloc[0]
    assert row["summary"] == "01/02/2020: Attack near station"
    assert row["admin0_txt"] == "Ukraine"
    assert row["city_txt"] == "Kyiv"
    assert row["event_date"] == pd.Timestamp(datetime(2020, 1, 2))
    assert row["latitude"] == pytest.approx(50.4501)
    assert row["longitude"] == pytest.approx(30.5234)
    assert row["killed_low"] == pytest.approx(2)
    assert row["killed_high"] == pytest.approx(5)


def test_terrorism_loader_removes_rows_missing_latitude_or_longitude(tmp_path):
    source_file = tmp_path / "terrorism_missing_coords.xlsx"
    pd.DataFrame(
        [
            {"summary": "Valid", "event_date": "2020-01-01", "latitude": "1", "longitude": "2"},
            {"summary": "No latitude", "event_date": "2020-01-02", "latitude": None, "longitude": "2"},
            {"summary": "No longitude", "event_date": "2020-01-03", "latitude": "1", "longitude": None},
        ]
    ).to_excel(source_file, index=False)

    df = load_terrorism_dataset(str(source_file))

    assert df["summary"].tolist() == ["Valid"]


def test_event1pd_csv_loader_converts_coordinates_and_integer_flags(tmp_path):
    source_file = tmp_path / "event1pd.csv"
    pd.DataFrame(
        [
            {
                "latitude": "49.8397",
                "longitude": "24.0297",
                "n_reports": "3",
                "t_mil_b": "not a number",
                "a_rus_b": "2",
                "t_airstrike_b": "1",
            }
        ]
    ).to_csv(source_file, index=False)

    df = load_event1pd_dataset(str(source_file))

    assert df.loc[0, "latitude"] == pytest.approx(49.8397)
    assert df.loc[0, "longitude"] == pytest.approx(24.0297)
    assert df.loc[0, "n_reports"] == 3
    assert df.loc[0, "t_mil_b"] == 0
    assert df.loc[0, "a_rus_b"] == 2
    assert df.loc[0, "t_airstrike_b"] == 1


def test_generic_csv_loader_converts_dates_coordinates_and_strips_whitespace(tmp_path):
    source_file = tmp_path / "gdacs.csv"
    pd.DataFrame(
        [
            {
                "title": "# comment row",
                "from_date": "2026-01-01",
                "to_date": "2026-01-02",
                "geo_lat": "0",
                "geo_long": "0",
                "severity_value": "0",
            },
            {
                "title": "  Flood warning  ",
                "from_date": "2026-02-01T12:30:00Z",
                "to_date": "2026-02-02T12:30:00Z",
                "geo_lat": "51.5074",
                "geo_long": "-0.1278",
                "severity_unit": "  Magnitude  ",
                "severity_value": "4.5",
            },
        ]
    ).to_csv(source_file, index=False)

    df = load_dataset(str(source_file))

    assert len(df) == 1
    row = df.iloc[0]
    assert row["title"] == "Flood warning"
    assert row["severity_unit"] == "Magnitude"
    assert row["geo_lat"] == pytest.approx(51.5074)
    assert row["geo_long"] == pytest.approx(-0.1278)
    assert row["severity_value"] == pytest.approx(4.5)
    assert not pd.isna(row["from_date"])
    assert not pd.isna(row["to_date"])

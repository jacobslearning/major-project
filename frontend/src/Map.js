import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

import {
  mdiAlertCircle,
  mdiFire,
  mdiTriangleWave,
  mdiBomb,
  mdiHomeFlood,
} from "@mdi/js";

const getSeverityColor = (type, severity) => {
  if (type === "Terrorist Attack") {
    if (!severity) return "blue";

    const killedMatch = severity.match(/killed[:\s]+(\d+)/i);
    const woundedMatch = severity.match(/wounded[:\s]+(\d+)/i);

    const killed = killedMatch ? parseInt(killedMatch[1]) : 0;
    const wounded = woundedMatch ? parseInt(woundedMatch[1]) : 0;

    if (killed > 0) return "red";
    if (wounded > 0) return "orange";
    return "blue";
  }

  if (!severity) return "blue";

  if (type === "Earthquake") {
    const mag = parseFloat(severity.replace("M ", ""));
    if (mag < 4.0) return "green";
    else if (mag < 6.0) return "orange";
    else return "red";
  }

  if (type === "Wildfire") {
    const ha = parseFloat(severity.replace("ha ", ""));
    if (ha < 1000) return "green";
    else if (ha < 10000) return "orange";
    else return "red";
  }

  return "blue";
};

const getMarkerIcon = (type, severity) => {
  const color = getSeverityColor(type, severity);

  let path = mdiAlertCircle;
  if (type === "Earthquake") path = mdiTriangleWave;
  else if (type === "Wildfire") path = mdiFire;
  else if (type === "Terrorist Attack") path = mdiBomb;
  else if (type === "Flood") path = mdiHomeFlood;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
      <path fill="${color}" d="${path}" />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    iconSize: [28, 28],
    className: "",
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const Map = () => {
  const [incidents, setIncidents] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchIncidents = () => {
    setLoading(true);
    let url = "http://localhost:8000/incidents/";
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    axios
      .get(url, { params })
      .then((res) => setIncidents(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidents();
  }, []); // initial load

  const handleFilter = () => {
    fetchIncidents();
  };

  return (
    <>
      <div style={{ marginBottom: "10px" }}>
        <label>
          Start Date:{" "}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label style={{ marginLeft: "10px" }}>
          End Date:{" "}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button onClick={handleFilter} style={{ marginLeft: "10px" }}>
          Filter
        </button>
      </div>

      {loading && <div>Loading incidents...</div>}

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {incidents.map((inc) => (
          <Marker
            key={inc.incident_id}
            position={[inc.latitude || 0, inc.longitude || 0]}
            icon={getMarkerIcon(inc.type, inc.severity?.toLowerCase())}
          >
            <Popup>
              <b>{inc.title}</b>
              <br />
              Type: {inc.type || "N/A"} <br />
              Severity: {inc.severity || "N/A"} <br />
              Location: {inc.city || "N/A"}, {inc.country || "N/A"} <br />
              Date Occurred:{" "}
              {inc.date_occurred
                ? new Date(inc.date_occurred).toLocaleDateString()
                : "N/A"}
              <br />
              {inc.source_url && (
                <a href={inc.source_url} target="_blank" rel="noreferrer">
                  Source
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
};

export default Map;

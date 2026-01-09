import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

import { mdiAlertCircle, mdiFire, mdiTriangleWave } from "@mdi/js";

const getSeverityColor = (type, severity) => {
  if (!severity) return "blue"; // default

  if (type === "Earthquake") {
    // magnitude
    const mag = parseFloat(severity.replace("M ", ""));
    if (mag < 4.0) return "green";
    else if (mag < 6.0) return "orange";
    else return "red";
  } else if (type === "Wildfire") {
    // fire
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
      <path fill="${color}" d="${path}" />
  </svg>`;

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

  useEffect(() => {
    axios
      .get("http://localhost:8000/incidents/")
      .then((res) => setIncidents(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
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
  );
};

export default Map;

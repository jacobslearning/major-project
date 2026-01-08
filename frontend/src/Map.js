import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const getMarkerIcon = (severity) => {
  let color = "blue";
  if (severity === "low") color = "green";
  else if (severity === "medium") color = "orange";
  else if (severity === "high") color = "red";

  return new L.Icon({
    iconUrl: `https://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=info|${color}`,
    iconSize: [30, 50],
    iconAnchor: [15, 50],
    popupAnchor: [0, -50],
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
          icon={getMarkerIcon(inc.severity?.toLowerCase())}
        >
          <Popup>
            <b>{inc.title}</b>
            <br />
            Type: {inc.type} <br />
            Severity: {inc.severity} <br />
            Location: {inc.city}, {inc.country} <br />
            <a href={inc.source_url} target="_blank" rel="noreferrer">
              Source
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;

import { useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import {
  mdiAlertCircle,
  mdiFire,
  mdiTriangleWave,
  mdiBomb,
  mdiHomeFlood,
  mdiVolcano,
  mdiWaterAlert,
  mdiTank,
  mdiShield,
  mdiHospitalBox,
  mdiAirplane,
  mdiShieldCheck,
  mdiHospitalMarker,
  mdiPistol,
} from "@mdi/js";

const getSeverityColor = (type, severity) => {
  if (type.startsWith("Terrorist Attack")) {
    if (!severity) return "blue";

    const killedMatch = severity.match(/killed[:\s]+(\d+)/i);
    const woundedMatch = severity.match(/wounded[:\s]+(\d+)/i);

    const killed = killedMatch ? parseInt(killedMatch[1]) : 0;
    const wounded = woundedMatch ? parseInt(woundedMatch[1]) : 0;

    if (killed > 0) return "red";
    if (wounded > 0) return "orange";
    return "gray";
  }
  if (
    type === "Air Strike" ||
    type === "Artillery Strike" ||
    type === "UAV Attack"
  )
    return "red";
  if (type === "Firefight" || type === "Raid" || type === "Armor Engagement")
    return "orange";
  if (type === "Occupation" || type === "Retreat" || type === "Loc Ops")
    return "blue";
  if (type === "Arrest" || type === "Sanctions" || type === "Control")
    return "purple";
  if (type === "IED" || type === "Cyber Attack") return "black";
  if (type === "Military Casualty") return "darkred";
  if (type === "Civilian Casualty") return "darkorange";
  if (type === "Hospital Attack") return "pink";
  if (type === "Property Damage") return "brown";
  if (type === "Volcano") {
    // red for ongoing eruptions
    return "red";
  }

  if (!severity) return "gray";

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

  if (type === "Drought") {
    const km2 = parseFloat(severity.replace("km2", "").trim());
    if (isNaN(km2)) return "gray";
    if (km2 < 100000) return "green";
    if (km2 < 500000) return "orange";
    return "red";
  }

  return "gray";
};

const iconCache = {};

const getMarkerIcon = (type, severity) => {
  const key = `${type}-${severity}`;
  if (iconCache[key]) return iconCache[key];

  const color = getSeverityColor(type, severity);

  let path = mdiAlertCircle;
  switch (type) {
    case "Earthquake":
      path = mdiTriangleWave;
      break;
    case "Wildfire":
      path = mdiFire;
      break;
    case "Volcano":
      path = mdiVolcano;
      break;
    case "Flood":
      path = mdiHomeFlood;
      break;
    case "Drought":
      path = mdiWaterAlert;
      break;
    case "Terrorist Attack":
    case "Terrorist Attack: Car Bomb":
    case "Terrorist Attack: Suicide Bombing":
      path = mdiBomb;
      break;
    case "Air Strike":
    case "Artillery Strike":
    case "UAV Attack":
      path = mdiAirplane;
      break;
    case "Firefight":
      path = mdiPistol;
      break;
    case "Raid":
    case "Armor Engagement":
      path = mdiTank;
      break;
    case "Occupation":
    case "Retreat":
    case "Loc Ops":
      path = mdiShield;
      break;
    case "Arrest":
    case "Sanctions":
    case "Control":
      path = mdiShieldCheck;
      break;
    case "IED":
    case "Cyber Attack":
      path = mdiBomb;
      break;
    case "Military Casualty":
      path = mdiHospitalMarker;
      break;
    case "Civilian Casualty":
      path = mdiHospitalMarker;
      break;
    case "Hospital Attack":
      path = mdiHospitalBox;
      break;
    case "Property Damage":
      path = mdiFire;
      break;
    default:
      path = mdiAlertCircle;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
      <path fill="${color}" d="${path}" />
    </svg>
  `;

  const icon = L.divIcon({
    html: svg,
    iconSize: [28, 28],
    className: "",
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

  iconCache[key] = icon;
  return icon;
};

export const ClusteredMarkers = ({ incidents }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !incidents || incidents.length === 0) return;

    map.whenReady(() => {
      const markers = L.markerClusterGroup({ chunkedLoading: true });

      incidents.forEach((inc) => {
        if (!inc.latitude || !inc.longitude) return;

        const marker = L.marker([inc.latitude, inc.longitude], {
          icon: getMarkerIcon(inc.type, inc.severity),
        });

        const popupContent = `
        <b>${inc.title}</b><br/>
        Type: ${inc.type || "N/A"}<br/>
        Severity: ${inc.severity || "N/A"}<br/>
        Location: ${inc.city || "N/A"}, ${inc.country || "N/A"}<br/>
        Date: ${
          inc.date_occurred
            ? new Date(inc.date_occurred).toLocaleDateString()
            : "N/A"
        }<br/>
        ${
          inc.source_url
            ? `<a href="${inc.source_url}" target="_blank">Source</a>`
            : ""
        }
      `;

        marker.bindPopup(popupContent);
        markers.addLayer(marker);
      });

      map.addLayer(markers);

      return () => {
        map.removeLayer(markers);
      };
    });
  }, [map, incidents]);

  return null;
};

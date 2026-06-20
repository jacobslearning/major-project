import { useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";
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
  if (type?.startsWith("Terrorist Attack")) {
    if (!severity) return "blue";
    const killed = parseInt(severity.match(/killed[:\s]+(\d+)/i)?.[1] ?? 0);
    const wounded = parseInt(severity.match(/wounded[:\s]+(\d+)/i)?.[1] ?? 0);
    if (killed > 0) return "red";
    if (wounded > 0) return "orange";
    return "gray";
  }
  if (["Air Strike", "Artillery Strike", "UAV Attack"].includes(type))
    return "red";
  if (["Firefight", "Raid", "Armor Engagement"].includes(type)) return "orange";
  if (["Occupation", "Retreat", "Loc Ops"].includes(type)) return "blue";
  if (["Arrest", "Sanctions", "Control"].includes(type)) return "purple";
  if (["IED", "Cyber Attack"].includes(type)) return "black";
  if (type === "Military Casualty") return "darkred";
  if (type === "Civilian Casualty") return "darkorange";
  if (type === "Hospital Attack") return "pink";
  if (type === "Property Damage") return "brown";
  if (type === "Volcano") return "red";
  if (!severity) return "gray";
  if (type === "Earthquake") {
    const mag = parseFloat(severity.replace("M ", ""));
    if (mag < 4.0) return "green";
    if (mag < 6.0) return "orange";
    return "red";
  }
  if (type === "Wildfire") {
    const ha = parseFloat(severity.replace("ha ", ""));
    if (ha < 1000) return "green";
    if (ha < 10000) return "orange";
    return "red";
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

  if (type?.startsWith("Terrorist Attack")) {
    path = mdiBomb;
  } else {
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
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
    <path fill="${color}" d="${path}" />
  </svg>`;

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

const escapeHtml = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const formatReliability = (score) => {
  if (score === null || score === undefined || score === "") return "N/A";
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) return escapeHtml(score);
  return `${numericScore}/100`;
};

const formatCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "N/A";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const getIncidentType = (inc) => inc.incident_type?.type || inc.type || "N/A";
const getIncidentDate = (inc) => inc.incident_date || inc.date_occurred;
const getSource = (inc) => inc.source || {};

const buildSourceUrlHtml = (sourceUrl) => {
  if (!sourceUrl) return "N/A";
  if (!isHttpUrl(sourceUrl)) return escapeHtml(sourceUrl);

  return `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>`;
};

const hasDisplayValue = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text.toUpperCase() !== "N/A";
};

const formatDescriptionDetails = (description) =>
  String(description)
    .split(/\r?\n/)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      const value = rest.join(":").trim();

      if (!value) {
        return `<div>${escapeHtml(line)}</div>`;
      }

      return `
        <div>
          <strong>${escapeHtml(label.trim())}:</strong>
          ${escapeHtml(value)}
        </div>
      `;
    })
    .join("");

const buildPopupHtml = (inc) => {
  const type = getIncidentType(inc);
  const source = getSource(inc);
  const sourceUrl = source.source_url || inc.source_url;
  const sourceName = source.source_name || "N/A";
  const sourceType = source.source_type || "N/A";
  const updateFrequency = source.update_frequency || "N/A";
  const reliabilityScore = formatReliability(source.reliability_score);
  const reliabilityNotes = source.reliability_notes || "N/A";

  const detailsHtml = hasDisplayValue(inc.description)
    ? `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 700; border-bottom: 1px solid #ddd; margin-bottom: 3px;">Details</div>
        <div>${formatDescriptionDetails(inc.description)}</div>
      </div>
    `
    : "";

  return `
    <div style="min-width: 260px; max-width: 360px; line-height: 1.35;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">
        ${escapeHtml(inc.title)}
      </div>

      <div style="margin-bottom: 8px;">
        <div><strong>Type:</strong> ${escapeHtml(type)}</div>
        <div><strong>Severity:</strong> ${escapeHtml(inc.severity)}</div>
        <div><strong>Country:</strong> ${escapeHtml(inc.country)}</div>
        <div><strong>Coordinates:</strong> ${escapeHtml(formatCoordinates(inc.latitude, inc.longitude))}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatDate(getIncidentDate(inc)))}</div>
      </div>

      ${detailsHtml}

      <div>
        <div style="font-weight: 700; border-bottom: 1px solid #ddd; margin-bottom: 3px;">Source</div>
        <div><strong>Name:</strong> ${escapeHtml(sourceName)}</div>
        <div><strong>Type:</strong> ${escapeHtml(sourceType)}</div>
        <div><strong>Update frequency:</strong> ${escapeHtml(updateFrequency)}</div>
        <div><strong>Reliability:</strong> ${escapeHtml(reliabilityScore)}</div>
        <div><strong>Reliability notes:</strong> ${escapeHtml(reliabilityNotes)}</div>
        <div><strong>URL:</strong> ${buildSourceUrlHtml(sourceUrl)}</div>
      </div>
    </div>
  `;
};

const BATCH_SIZE = 200;

export const ClusteredMarkers = ({ incidents }) => {
  const map = useMap();
  const clusterRef = useRef(null);
  const batchTimerRef = useRef(null);

  useEffect(() => {
    if (!map || clusterRef.current) return;

    clusterRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 30,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 60,
    });

    map.addLayer(clusterRef.current);

    return () => {
      if (clusterRef.current && map) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!clusterRef.current) return;

    if (batchTimerRef.current) {
      cancelAnimationFrame(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const cluster = clusterRef.current;
    cluster.clearLayers();

    const valid = (incidents || []).filter((inc) => {
      const lat = Number(inc.latitude);
      const lng = Number(inc.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });

    if (valid.length === 0) return;

    const markers = valid.map((inc) => {
      const type = getIncidentType(inc);
      const marker = L.marker([Number(inc.latitude), Number(inc.longitude)], {
        icon: getMarkerIcon(type, inc.severity),
      });

      marker.bindPopup(buildPopupHtml(inc), { maxWidth: 420 });
      return marker;
    });

    let offset = 0;
    const addBatch = () => {
      const batch = markers.slice(offset, offset + BATCH_SIZE);
      cluster.addLayers(batch);
      offset += BATCH_SIZE;
      if (offset < markers.length) {
        batchTimerRef.current = requestAnimationFrame(addBatch);
      }
    };

    batchTimerRef.current = requestAnimationFrame(addBatch);

    return () => {
      if (batchTimerRef.current) cancelAnimationFrame(batchTimerRef.current);
    };
  }, [incidents]);

  return null;
};

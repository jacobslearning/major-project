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
    if (!severity) return "gray";

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

const getIconPath = (type) => {
  if (type === "Earthquake") return mdiTriangleWave;
  if (type === "Wildfire") return mdiFire;
  if (type.startsWith("Terrorist Attack")) return mdiBomb;
  if (type === "Flood") return mdiHomeFlood;
  if (type === "Drought") return mdiWaterAlert;
  if (type === "Volcano") return mdiVolcano;
  if (
    type === "Air Strike" ||
    type === "Artillery Strike" ||
    type === "UAV Attack"
  )
    return mdiAirplane;
  if (type === "Firefight") return mdiPistol;

  if (type === "Raid" || type === "Armor Engagement") return mdiTank;
  if (type === "Occupation" || type === "Retreat" || type === "Loc Ops")
    return mdiShield;
  if (type === "Arrest" || type === "Sanctions" || type === "Control")
    return mdiShieldCheck;
  if (type === "IED" || type === "Cyber Attack") return mdiBomb;
  if (type === "Military Casualty") return mdiHospitalMarker;

  if (type === "Civilian Casualty") return mdiHospitalMarker;
  if (type === "Hospital Attack") return mdiHospitalBox;

  if (type === "Property Damage") return mdiFire;
  return mdiAlertCircle;
};

const RecentIncidents = ({ incidents = [], onSelectIncident }) => {
  const sortedIncidents = [...incidents].sort((a, b) => {
    const dateA = a.date_occurred ? new Date(a.date_occurred) : new Date(0);
    const dateB = b.date_occurred ? new Date(b.date_occurred) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="recent">
      <h3>Recent Incidents</h3>

      <ul>
        {sortedIncidents.slice(0, 100).map((inc) => {
          const color = getSeverityColor(inc.type, inc.severity);
          const path = getIconPath(inc.type);

          return (
            <li
              key={inc.incident_id}
              className="recent-item"
              role="button"
              tabIndex={0}
              onClick={() => onSelectIncident?.(inc)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelectIncident?.(inc);
              }}
            >
              <div className="incident-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={path} fill={color} />
                </svg>
              </div>

              <div className="incident-content">
                <strong>{inc.type}</strong>
                <div className="title">{inc.title}</div>
                <small>
                  {inc.country} -{" "}
                  {inc.date_occurred
                    ? new Date(inc.date_occurred).toLocaleDateString()
                    : "N/A"}
                </small>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecentIncidents;

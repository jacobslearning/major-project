import {
  mdiAlertCircle,
  mdiFire,
  mdiTriangleWave,
  mdiBomb,
  mdiHomeFlood,
} from "@mdi/js";

const getSeverityColor = (type, severity) => {
  if (type === "Terrorist Attack") {
    if (!severity) return "gray";

    const killedMatch = severity.match(/killed[:\s]+(\d+)/i);
    const woundedMatch = severity.match(/wounded[:\s]+(\d+)/i);

    const killed = killedMatch ? parseInt(killedMatch[1]) : 0;
    const wounded = woundedMatch ? parseInt(woundedMatch[1]) : 0;

    if (killed > 0) return "red";
    if (wounded > 0) return "orange";
    return "gray";
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

  return "gray";
};

const getIconPath = (type) => {
  if (type === "Earthquake") return mdiTriangleWave;
  if (type === "Wildfire") return mdiFire;
  if (type === "Terrorist Attack") return mdiBomb;
  if (type === "Flood") return mdiHomeFlood;
  return mdiAlertCircle;
};

const RecentIncidents = ({ incidents = [], onSelectIncident }) => {
  return (
    <div className="recent">
      <h3>Recent Incidents</h3>

      <ul>
        {incidents.slice(0, 15).map((inc) => {
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

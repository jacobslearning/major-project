const Metrics = ({ incidents = [] }) => {
  const total = incidents.length;
  const earthquakes = incidents.filter((i) => i.type === "Earthquake").length;
  const wildfires = incidents.filter((i) => i.type === "Wildfire").length;
  const floods = incidents.filter((i) => i.type === "Flood").length;
  const attacks = incidents.filter((i) => i.type === "Terrorist Attack").length;

  return (
    <div className="metrics">
      <div className="metric">
        <span className="metric-label">Total Incidents</span>
        <span className="metric-value">{total}</span>
      </div>

      <div className="metric red">
        <span>Earthquakes</span>
        <span>{earthquakes}</span>
      </div>

      <div className="metric orange">
        <span>Wildfires</span>
        <span>{wildfires}</span>
      </div>

      <div className="metric orange">
        <span>Floods</span>
        <span>{floods}</span>
      </div>

      <div className="metric dark">
        <span>Terrorist Attacks</span>
        <span>{attacks}</span>
      </div>
    </div>
  );
};

export default Metrics;

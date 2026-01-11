const Metrics = ({ incidents = [] }) => {
  const total = incidents.length;
  const earthquakes = incidents.filter((i) => i.type === "Earthquake").length;
  const wildfires = incidents.filter((i) => i.type === "Wildfire").length;
  const floods = incidents.filter((i) => i.type === "Flood").length;
  const droughts = incidents.filter((i) => i.type === "Drought").length;
  const volcanos = incidents.filter((i) => i.type === "Volcano").length;
  const protests = incidents.filter((i) => i.type === "Protest").length;
  const airStrikes = incidents.filter((i) => i.type === "Air Strike").length;
  const ukraineIncidents = incidents.filter(
    (i) => i.country === "Ukraine"
  ).length;
  const attacks = incidents.filter((i) =>
    i.type?.startsWith("Terrorist Attack")
  ).length;

  return (
    <div className="metrics">
      <div className="metric">
        <span className="metric-label">Total Incidents</span>
        <span className="metric-value">{total}</span>
      </div>

      <div className="metric dark">
        <span>Ukraine Incidents</span>
        <span>{ukraineIncidents}</span>
      </div>

      <div className="metric dark">
        <span>Terrorist Attacks</span>
        <span>{attacks}</span>
      </div>

      <div className="metric dark">
        <span>Air Strikes</span>
        <span>{airStrikes}</span>
      </div>

      <div className="metric dark">
        <span>Protests</span>
        <span>{protests}</span>
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

      <div className="metric orange">
        <span>Droughts</span>
        <span>{droughts}</span>
      </div>

      <div className="metric orange">
        <span>Volcanos</span>
        <span>{volcanos}</span>
      </div>
    </div>
  );
};

export default Metrics;

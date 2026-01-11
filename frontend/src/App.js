import { useEffect, useState } from "react";
import axios from "axios";

import Header from "./components/Header";
import MetricsPanel from "./components/Metrics";
import RecentIncidents from "./components/RecentIncidents";
import Map from "./components/Map";

import { ThreeDot } from "react-loading-indicators";

import "./App.css";

function App() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const twoMonthsAgoString = twoMonthsAgo.toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(twoMonthsAgoString);
  const [toDate, setToDate] = useState(today);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const allIncidentTypes = Array.from(
    new Set(incidents.map((i) => i.type).filter(Boolean))
  ).sort();

  useEffect(() => {
    axios
      .get("http://localhost:8000/incidents/")
      .then((res) => setIncidents(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">
          <ThreeDot
            variant="bounce"
            color="#00afff"
            size="large"
            text="Loading incidents..."
            textColor="white"
          />
        </div>
      </div>
    );
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (!inc.date_occurred) return false;
    const incDate = new Date(inc.date_occurred).toISOString().split("T")[0];
    if (fromDate && incDate < fromDate) return false;
    if (toDate && incDate > toDate) return false;
    if (selectedTypes.length && !selectedTypes.includes(inc.type)) return false;
    return true;
  });

  return (
    <div className="app">
      <Header
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
      />

      <div className="app-body">
        <MetricsPanel incidents={filteredIncidents} />
        <RecentIncidents
          incidents={filteredIncidents}
          onSelectIncident={setSelectedIncident}
        />
        <Map
          incidents={filteredIncidents}
          selectedIncident={selectedIncident}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          allTypes={allIncidentTypes}
        />
      </div>
    </div>
  );
}

export default App;

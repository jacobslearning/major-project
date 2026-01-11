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

  return (
    <div className="app">
      <Header />

      <div className="app-body">
        <MetricsPanel incidents={incidents} />
        <RecentIncidents
          incidents={incidents}
          onSelectIncident={setSelectedIncident}
        />
        <Map incidents={incidents} selectedIncident={selectedIncident} />
      </div>
    </div>
  );
}

export default App;

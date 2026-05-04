import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import axios from "axios";

import Header from "./components/Header";
import Navbar from "./components/Navbar";
import MetricsPanel from "./components/Metrics";
import RecentIncidents from "./components/RecentIncidents";
import Map from "./components/Map";
import DailyBrief from "./pages/DailyBrief";
import Sources from "./pages/Sources";
import Incidents from "./pages/Incidents";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { ThreeDot } from "react-loading-indicators";

import "./App.css";
import "./govuk-overrides.css";

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
    new Set(incidents.map((i) => i.type).filter(Boolean)),
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

  function AppContent() {
    const location = useLocation();
    const hideNavbar = ["/login", "/register"].includes(location.pathname);
    return (
      <div className="app">
        {!hideNavbar && <Navbar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <>
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
              </>
            }
          />
          <Route path="/daily-brief" element={<DailyBrief />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/incidents" element={<Incidents />} />
        </Routes>
      </div>
    );
  }
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

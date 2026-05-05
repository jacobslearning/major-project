import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

function ProtectedRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(!isAuthPage);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const [fromDate, setFromDate] = useState(
    twoMonthsAgo.toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(today);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const allIncidentTypes = Array.from(
    new Set(incidents.map((i) => i.type).filter(Boolean)),
  ).sort();

  useEffect(() => {
    if (isAuthPage || !getToken()) {
      setLoading(false);
      return;
    }

    axios
      .get("http://localhost:8000/incidents/", {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      .then((res) => setIncidents(res.data))
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [isAuthPage]);

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
      {!isAuthPage && <Navbar onLogout={logout} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
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
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-brief"
          element={
            <ProtectedRoute>
              <DailyBrief />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sources"
          element={
            <ProtectedRoute>
              <Sources />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <Incidents />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

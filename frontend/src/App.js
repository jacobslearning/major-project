import { useEffect, useState, useCallback, useRef } from "react";
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
import LiveFeed from "./pages/LiveFeed";
import Users from "./pages/Users";
import Logout from "./pages/Logout";
import {getRole} from "./utils/authHelpers";

import { ThreeDot } from "react-loading-indicators";

import "./App.css";
import "./govuk-overrides.css";

const API_URL = "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

function ProtectedRoute({ children, requiredRole = null }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (requiredRole && getRole() !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}
// debounce hook taken from w3schools
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  const isAdmin = getRole() === "administrator";

  const today = new Date().toISOString().split("T")[0];
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const [fromDate, setFromDate] = useState(
    twoMonthsAgo.toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(today);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const [incidents, setIncidents] = useState([]);
  const [allIncidentTypes, setAllIncidentTypes] = useState([]);
  const [loading, setLoading] = useState(!isAuthPage);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const debouncedFrom = useDebounce(fromDate, 600);
  const debouncedTo = useDebounce(toDate, 600);

  const cancelRef = useRef(null);

  const fetchIncidents = useCallback(async (from, to) => {
    if (!getToken()) return;

    if (cancelRef.current) cancelRef.current.abort();
    const controller = new AbortController();
    cancelRef.current = controller;

    setFetchingMore(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append("start_date", from);
      if (to) params.append("end_date", to);

      const res = await axios.get(`${API_URL}/incidents/?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: controller.signal,
      });

      const data = res.data;
      setIncidents(data);

      setAllIncidentTypes(
        Array.from(new Set(data.map((i) => i.type).filter(Boolean))).sort(),
      );
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      if (err.response?.status === 401) logout();
    } finally {
      setFetchingMore(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  if (isAuthPage) {
    setLoading(false);
    return;
  }

  if (!getToken()) {
    setLoading(false);
    return;
  }

  fetchIncidents(debouncedFrom, debouncedTo);
}, [isAuthPage, debouncedFrom, debouncedTo, fetchIncidents]);

  const filteredIncidents = selectedTypes.length
    ? incidents.filter((inc) => selectedTypes.includes(inc.type))
    : incidents;

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
      {!isAuthPage && <Navbar isAdmin={isAdmin} />}
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
                {fetchingMore && (
                  <div
                    style={{
                      height: 3,
                      background:
                        "linear-gradient(90deg, #00afff 0%, #0077cc 100%)",
                      animation: "pulse 1.2s ease-in-out infinite",
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                    }}
                  />
                )}
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
        <Route
          path="/live-feed"
          element={
            <ProtectedRoute>
              <LiveFeed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logout"
          element={
            <ProtectedRoute>
              <Logout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="administrator">
              <Users />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
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

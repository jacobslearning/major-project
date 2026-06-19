import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Navbar = ({ onLogout, isAdmin }) => {
  return (
    <nav className="navbar">
      <ul className="navbar-list">
        <li>
          <Link to="/">Map</Link>
        </li>
        <li>
          <Link to="/daily-brief">Daily Brief</Link>
        </li>
        <li>
          <Link to="/live-feed">Live Feed</Link>
        </li>
        <li>
          <Link to="/sources">Sources</Link>
        </li>
        <li>
          <Link to="/incidents">Incidents</Link>
        </li>
        {isAdmin && (
          <li>
            <Link to="/users">Users</Link>
          </li>
        )}
      </ul>
      <div className="navbar-title">Overseas Incident Monitoring</div>
    </nav>
  );
};

export default Navbar;

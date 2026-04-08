import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Navbar = () => {
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
          <Link to="/sources">Sources</Link>
        </li>
        <li>
          <Link to="/incidents">Incidents</Link>
        </li>
      </ul>
      <div className="navbar-title">Overseas Incident Monitoring</div>
    </nav>
  );
};

export default Navbar;

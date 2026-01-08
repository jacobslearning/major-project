import React from "react";
import Map from "./Map";
import "./App.css";

const App = () => {
  return (
    <div>
      <header
        style={{
          textAlign: "center",
          padding: "1rem",
          background: "#003366",
          color: "white",
        }}
      >
        <h1>Overseas Incident Dashboard</h1>
      </header>
      <Map />
    </div>
  );
};

export default App;

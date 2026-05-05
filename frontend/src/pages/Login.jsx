import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";
import {
  getPasswordRules,
  isValidEmail,
  isValidPassword,
} from "../utils/validation";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = getPasswordRules(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setUsernameError("");
    setPasswordError("");
    setApiError("");

    let valid = true;

    if (!username) {
      setUsernameError("Username is required.");
      valid = false;
    }

    if (!isValidPassword(password)) {
      setPasswordError("Please meet all password requirements.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      const { data } = await axios.post(
        "http://localhost:8000/login",
        new URLSearchParams({ username: username, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      localStorage.setItem("token", data.access_token);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setApiError(msg || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ruleItem = (label, isValid) => (
    <li style={{ color: isValid ? "green" : "#6c757d" }}>
      {isValid ? "✔" : "○"} {label}
    </li>
  );

  return (
    <div
      className="govuk-width-container"
      style={{
        maxWidth: 600,
        minWidth: 400,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 className="govuk-heading-2" style={{ marginBottom: 8 }}>
          Overseas Incident Monitoring
        </h2>
        <h1 className="govuk-heading-l" style={{ marginTop: 0 }}>
          Sign in
        </h1>
      </div>

      {apiError && (
        <div className="govuk-error-summary" role="alert">
          <p className="govuk-error-message" style={{ marginBottom: 0 }}>
            {apiError}
          </p>
        </div>
      )}

      <form className="govuk-form-group" onSubmit={handleSubmit}>
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor="username">
            Username
          </label>
          <input
            className={`govuk-input ${usernameError ? "govuk-input--error" : ""}`}
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "95%" }}
          />
          {usernameError && (
            <p className="govuk-error-message">{usernameError}</p>
          )}
        </div>

        <div className="govuk-form-group" style={{ marginTop: 16 }}>
          <label className="govuk-label" htmlFor="password">
            Password
          </label>
          <input
            className={`govuk-input ${passwordError ? "govuk-input--error" : ""}`}
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "95%" }}
          />
          <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "0.9rem" }}>
            {ruleItem("At least 8 characters", passwordRules.length)}
            {ruleItem("One uppercase letter", passwordRules.upper)}
            {ruleItem("One lowercase letter", passwordRules.lower)}
            {ruleItem("One number", passwordRules.number)}
            {ruleItem("One special character", passwordRules.special)}
          </ul>
          {passwordError && (
            <p className="govuk-error-message">{passwordError}</p>
          )}
        </div>

        <button className="govuk-button" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }}>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";
import {
  isValidEmail,
  isValidPassword,
  getPasswordRules,
} from "../utils/validation";

const Register = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = getPasswordRules(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setUsernameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setApiError("");

    let valid = true;

    if (!username.trim()) {
      setUsernameError("Enter a username.");
      valid = false;
    }

    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!isValidPassword(password)) {
      setPasswordError("All password requirements must be met.");
      valid = false;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      await axios.post("http://localhost:8000/register", {
        username,
        email,
        password,
      });

      navigate("/login", { state: { registered: true } });
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (typeof msg === "string") {
        if (msg.toLowerCase().includes("username")) setUsernameError(msg);
        else if (msg.toLowerCase().includes("email")) setEmailError(msg);
        else setApiError(msg);
      } else {
        setApiError("Registration failed. Please try again.");
      }
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
          Register
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
          <label className="govuk-label" htmlFor="email">
            Email address
          </label>
          <input
            className={`govuk-input ${emailError ? "govuk-input--error" : ""}`}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "95%" }}
          />
          {emailError && <p className="govuk-error-message">{emailError}</p>}
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
          <ul
            style={{
              listStyle: "none",
              paddingLeft: 0,
              fontSize: "0.9rem",
              marginTop: 10,
            }}
          >
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

        <div className="govuk-form-group" style={{ marginTop: 16 }}>
          <label className="govuk-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            className={`govuk-input ${confirmError ? "govuk-input--error" : ""}`}
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "95%" }}
          />
          {confirmError && (
            <p className="govuk-error-message">{confirmError}</p>
          )}
        </div>

        <button className="govuk-button" type="submit" disabled={loading}>
          {loading ? "Registering…" : "Register"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
};

export default Register;

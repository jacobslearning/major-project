import React, { useState } from "react";
import "../App.css";
import {
  getPasswordRules,
  isValidEmail,
  isValidPassword,
} from "../utils/validation";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordRules = getPasswordRules(password);

  const handleSubmit = (e) => {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");

    let valid = true;

    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!isValidPassword(password)) {
      setPasswordError("Please meet all password requirements.");
      valid = false;
    }

    if (!valid) return;

    alert("Login submitted (API call placeholder)");
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

      <form className="govuk-form-group" onSubmit={handleSubmit}>
        <div className="govuk-form-group">
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

        <button className="govuk-button" type="submit">
          Sign in
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }}>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;

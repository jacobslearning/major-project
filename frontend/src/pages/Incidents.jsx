import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ThreeDot } from "react-loading-indicators";
import { COUNTRIES } from "../utils/geo";
import { getRole } from "../utils/authHelpers";
import styles from "../styles/Incidents.module.css";

const API_URL = "http://localhost:8000";

const toDateInputValue = (date) => date.toISOString().split("T")[0];

const getDefaultFromDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return toDateInputValue(date);
};

const getDefaultToDate = () => {
  return toDateInputValue(new Date());
};

const getToken = () => localStorage.getItem("token");

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const emptyIncident = {
  title: "",
  description: "",
  incident_type_id: "",
  source_id: "",
  incident_date: "",
  country: "",
  latitude: "",
  longitude: "",
  severity: "",
};

const emptySource = {
  source_name: "",
  source_type: "dataset",
  source_url: "",
  update_frequency: "",
  reliability_notes: "",
  reliability_score: "",
};

const getIncidentTypeName = (incident) => {
  return incident.incident_type?.type || incident.type || "N/A";
};

const getIncidentSourceName = (incident) => {
  return incident.source?.source_name || "N/A";
};

const getIncidentDate = (incident) => {
  return incident.incident_date || incident.date_occurred || null;
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString();
};

const formatCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined) return "N/A";
  if (longitude === null || longitude === undefined) return "N/A";

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "N/A";
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [sources, setSources] = useState([]);

  const [typeFilter, setTypeFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState(getDefaultFromDate());
  const [toDateFilter, setToDateFilter] = useState(getDefaultToDate());

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newIncident, setNewIncident] = useState(emptyIncident);
  const [newSource, setNewSource] = useState(emptySource);
  const [useNewSource, setUseNewSource] = useState(true);

  const isAdmin = getRole() === "administrator";
  const [deletingIncidentId, setDeletingIncidentId] = useState(null);
  const [incidentToDelete, setIncidentToDelete] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async (fromDate = fromDateFilter, toDate = toDateFilter) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams();

      if (fromDate) {
        params.append("start_date", `${fromDate}T00:00:00`);
      }

      if (toDate) {
        params.append("end_date", `${toDate}T23:59:59`);
      }

      const incidentsUrl = `${API_URL}/incidents/?${params.toString()}`;

      const [incidentsRes, incidentTypesRes, sourcesRes] = await Promise.all([
        axios.get(incidentsUrl, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/incident-types/`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/sources/`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setIncidents(incidentsRes.data);
      setIncidentTypes(incidentTypesRes.data);
      setSources(sourcesRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateNewIncident = (field, value) => {
    setNewIncident((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNewSource = (field, value) => {
    setNewSource((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setNewIncident(emptyIncident);
    setNewSource(emptySource);
    setUseNewSource(true);
  };

  const validateIncident = () => {
    if (!newIncident.title.trim()) {
      return "Incident title is required";
    }

    if (!newIncident.incident_type_id) {
      return "Incident type is required";
    }

    if (newIncident.latitude.trim()) {
      const lat = Number(newIncident.latitude);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return "Latitude must be between -90 and 90";
      }
    }

    if (newIncident.longitude.trim()) {
      const lng = Number(newIncident.longitude);

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return "Longitude must be between -180 and 180";
      }
    }

    if (useNewSource) {
      if (!newSource.source_name.trim()) {
        return "Source name is required";
      }

      if (!newSource.source_url.trim()) {
        return "Source URL is required";
      }

      if (newSource.reliability_score !== "") {
        const score = Number(newSource.reliability_score);

        if (!Number.isInteger(score) || score < 0 || score > 100) {
          return "Reliability score must be from 0 to 100";
        }
      }
    } else if (!newIncident.source_id) {
      return "Select a source or create a new one";
    }

    return null;
  };

  const createIncident = async (event) => {
    event.preventDefault();

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const validationError = validateIncident();

      if (validationError) {
        setError(validationError);
        return;
      }

      let sourceId = newIncident.source_id
        ? Number(newIncident.source_id)
        : null;

      if (useNewSource) {
        const sourcePayload = {
          source_name: newSource.source_name.trim(),
          source_type: newSource.source_type.trim() || "dataset",
          source_url: newSource.source_url.trim(),
          update_frequency: newSource.update_frequency.trim() || null,
          reliability_notes: newSource.reliability_notes.trim() || null,
          reliability_score:
            newSource.reliability_score === ""
              ? null
              : Number(newSource.reliability_score),
        };

        const sourceRes = await axios.post(
          `${API_URL}/sources/`,
          sourcePayload,
          {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          },
        );

        const createdSource = sourceRes.data;
        sourceId = createdSource.source_id;

        setSources((current) => [...current, createdSource]);
      }

      const incidentPayload = {
        title: newIncident.title.trim(),
        description: newIncident.description.trim() || null,
        incident_type_id: Number(newIncident.incident_type_id),
        source_id: sourceId,
        incident_date: newIncident.incident_date || null,
        country: newIncident.country.trim() || null,
        latitude:
          newIncident.latitude.trim() === ""
            ? null
            : Number(newIncident.latitude),
        longitude:
          newIncident.longitude.trim() === ""
            ? null
            : Number(newIncident.longitude),
        severity: newIncident.severity.trim() || null,
      };

      const incidentRes = await axios.post(
        `${API_URL}/incidents/`,
        incidentPayload,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        },
      );

      const createdIncident = incidentRes.data;

      setIncidents((current) => [createdIncident, ...current]);
      setMessage(`Created incident: ${createdIncident.title}`);
      closeCreateDialog();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to create incident",
      );
    } finally {
      setCreating(false);
    }
  };

  const openDeleteDialog = (incident) => {
    setIncidentToDelete(incident);
    setError("");
    setMessage("");
  };

  const closeDeleteDialog = () => {
    if (deletingIncidentId !== null) {
      return;
    }

    setIncidentToDelete(null);
  };

  const confirmDeleteIncident = async () => {
    if (!incidentToDelete) {
      return;
    }

    const incident = incidentToDelete;
    const incidentId = incident.incident_id;

    setDeletingIncidentId(incidentId);
    setError("");
    setMessage("");

    try {
      await axios.delete(`${API_URL}/incidents/${incidentId}`, {
        headers: getAuthHeaders(),
      });

      setIncidents((current) =>
        current.filter((existingIncident) => {
          return existingIncident.incident_id !== incidentId;
        }),
      );

      setMessage(`Deleted incident: ${incident.title || incidentId}`);
      setIncidentToDelete(null);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to delete incident",
      );
    } finally {
      setDeletingIncidentId(null);
    }
  };

  // filtering code taken from w3schools
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const incidentDate = getIncidentDate(incident);

      if (typeFilter) {
        const typeId = incident.incident_type_id
          ? String(incident.incident_type_id)
          : "";

        if (typeId !== typeFilter) {
          return false;
        }
      }

      if (fromDateFilter || toDateFilter) {
        if (!incidentDate) {
          return false;
        }

        const incidentTime = new Date(incidentDate).getTime();

        if (Number.isNaN(incidentTime)) {
          return false;
        }

        if (fromDateFilter) {
          const fromTime = new Date(`${fromDateFilter}T00:00:00`).getTime();

          if (incidentTime < fromTime) {
            return false;
          }
        }

        if (toDateFilter) {
          const toTime = new Date(`${toDateFilter}T23:59:59`).getTime();

          if (incidentTime > toTime) {
            return false;
          }
        }
      }

      return true;
    });
  }, [incidents, typeFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    typeFilter,
    fromDateFilter,
    toDateFilter,
    rowsPerPage,
    filteredIncidents.length,
  ]);

  const totalRows = filteredIncidents.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = totalRows === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);

  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

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
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Incidents</h2>
          <p className={styles.subtitle}>
            Create incidents and filter existing records.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={() => loadData(fromDateFilter, toDateFilter)}
          >
            Refresh
          </button>

          <button
            className={styles.addBtn}
            onClick={() => setShowCreateDialog(true)}
          >
            + Incident
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {message && <div className={styles.successBox}>{message}</div>}

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span>Incident Type</span>
          <select
            className={styles.select}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            {incidentTypes.map((type) => (
              <option key={type.incident_type_id} value={type.incident_type_id}>
                {type.type}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.dateFilterGroup}>
          <label className={styles.filterField}>
            <span>From Date</span>
            <input
              className={styles.input}
              type="date"
              value={fromDateFilter}
              onChange={(event) => setFromDateFilter(event.target.value)}
            />
          </label>

          <label className={styles.filterField}>
            <span>To Date</span>
            <input
              className={styles.input}
              type="date"
              value={toDateFilter}
              onChange={(event) => setToDateFilter(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.filterActions}>
          <button
            className={styles.resetBtn}
            onClick={() => {
              const defaultFrom = getDefaultFromDate();
              const defaultTo = getDefaultToDate();

              setTypeFilter("");
              setFromDateFilter(defaultFrom);
              setToDateFilter(defaultTo);

              loadData(defaultFrom, defaultTo);
            }}
          >
            Reset to Last Month
          </button>
        </div>
      </div>

      {showCreateDialog && (
        <div className={styles.dialogBackdrop} onMouseDown={closeCreateDialog}>
          <form
            className={styles.dialog}
            onSubmit={createIncident}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <h3 className={styles.dialogTitle}>Create Incident</h3>
                <p className={styles.dialogSubtitle}>
                  Add a new incident and link it to its source.
                </p>
              </div>

              <button
                type="button"
                className={styles.dialogCloseBtn}
                onClick={closeCreateDialog}
              >
                x
              </button>
            </div>

            <div className={styles.dialogBody}>
              <label className={styles.formField}>
                <span>Title</span>
                <input
                  className={styles.input}
                  value={newIncident.title}
                  onChange={(event) =>
                    updateNewIncident("title", event.target.value)
                  }
                  placeholder="Incident title"
                />
              </label>

              <label className={styles.formField}>
                <span>Description</span>
                <textarea
                  className={styles.textarea}
                  value={newIncident.description}
                  onChange={(event) =>
                    updateNewIncident("description", event.target.value)
                  }
                  placeholder="Incident details"
                  rows="4"
                />
              </label>

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Incident Type</span>
                  <select
                    className={styles.select}
                    value={newIncident.incident_type_id}
                    onChange={(event) =>
                      updateNewIncident("incident_type_id", event.target.value)
                    }
                  >
                    <option disabled value="">
                      Select type
                    </option>
                    {incidentTypes.map((type) => (
                      <option
                        key={type.incident_type_id}
                        value={type.incident_type_id}
                      >
                        {type.type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Date</span>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={newIncident.incident_date}
                    onChange={(event) =>
                      updateNewIncident("incident_date", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Country</span>
                  <select
                    className={styles.select}
                    value={newIncident.country}
                    onChange={(event) =>
                      updateNewIncident("country", event.target.value)
                    }
                  >
                    <option disabled value="">
                      Select country
                    </option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Severity</span>
                  <input
                    className={styles.input}
                    value={newIncident.severity}
                    onChange={(event) =>
                      updateNewIncident("severity", event.target.value)
                    }
                    placeholder="Severity"
                  />
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>Latitude</span>
                  <input
                    className={styles.input}
                    value={newIncident.latitude}
                    onChange={(event) =>
                      updateNewIncident("latitude", event.target.value)
                    }
                    placeholder="i.e. 51.5074"
                  />
                </label>

                <label className={styles.formField}>
                  <span>Longitude</span>
                  <input
                    className={styles.input}
                    value={newIncident.longitude}
                    onChange={(event) =>
                      updateNewIncident("longitude", event.target.value)
                    }
                    placeholder="i.e. -0.1278"
                  />
                </label>
              </div>

              <div className={styles.divider} />

              <label className={styles.activeLabel}>
                <input
                  type="checkbox"
                  checked={useNewSource}
                  onChange={(event) => setUseNewSource(event.target.checked)}
                />
                Create a new source for this incident
              </label>

              {!useNewSource && (
                <label className={styles.formField}>
                  <span>Existing Source</span>
                  <select
                    className={styles.select}
                    value={newIncident.source_id}
                    onChange={(event) =>
                      updateNewIncident("source_id", event.target.value)
                    }
                  >
                    <option disabled value="">
                      Select source
                    </option>
                    {sources.map((source) => (
                      <option key={source.source_id} value={source.source_id}>
                        {source.source_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {useNewSource && (
                <div className={styles.sourceBox}>
                  <div className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Source Name</span>
                      <input
                        className={styles.input}
                        value={newSource.source_name}
                        onChange={(event) =>
                          updateNewSource("source_name", event.target.value)
                        }
                        placeholder="Source name"
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Source Type</span>
                      <input
                        className={styles.input}
                        value={newSource.source_type}
                        onChange={(event) =>
                          updateNewSource("source_type", event.target.value)
                        }
                        placeholder="dataset"
                      />
                    </label>
                  </div>

                  <label className={styles.formField}>
                    <span>Source URL</span>
                    <input
                      className={styles.input}
                      value={newSource.source_url}
                      onChange={(event) =>
                        updateNewSource("source_url", event.target.value)
                      }
                      placeholder="https://website.com"
                    />
                  </label>

                  <div className={styles.formGrid}>
                    <label className={styles.formField}>
                      <span>Update Frequency</span>
                      <input
                        className={styles.input}
                        value={newSource.update_frequency}
                        onChange={(event) =>
                          updateNewSource(
                            "update_frequency",
                            event.target.value,
                          )
                        }
                        placeholder="Hourly, Daily, Weekly, Monthly, Yearly, Never"
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Reliability Score</span>
                      <input
                        className={styles.input}
                        value={newSource.reliability_score}
                        onChange={(event) =>
                          updateNewSource(
                            "reliability_score",
                            event.target.value,
                          )
                        }
                        placeholder="0-100"
                      />
                    </label>
                  </div>

                  <label className={styles.formField}>
                    <span>Reliability Notes</span>
                    <textarea
                      className={styles.textarea}
                      value={newSource.reliability_notes}
                      onChange={(event) =>
                        updateNewSource("reliability_notes", event.target.value)
                      }
                      placeholder="Notes about source reliability"
                      rows="3"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={closeCreateDialog}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={styles.saveBtn}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Incident"}
              </button>
            </div>
          </form>
        </div>
      )}

      {incidentToDelete && (
        <div className={styles.dialogBackdrop} onMouseDown={closeDeleteDialog}>
          <div
            className={`${styles.dialog} ${styles.confirmDialog}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <h3 className={styles.dialogTitle}>Delete Incident</h3>
                <p className={styles.dialogSubtitle}>
                  Are you sure? This cannot be undone.
                </p>
              </div>

              <button
                type="button"
                className={styles.dialogCloseBtn}
                onClick={closeDeleteDialog}
                disabled={deletingIncidentId !== null}
              >
                x
              </button>
            </div>

            <div className={styles.dialogBody}>
              <p className={styles.confirmText}>
                You are about to permanently delete this incident:
              </p>

              <div className={styles.incidentPreview}>
                <strong>{incidentToDelete.title || "N/A"}</strong>
                <span>ID: {incidentToDelete.incident_id}</span>
              </div>
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={closeDeleteDialog}
                disabled={deletingIncidentId !== null}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.deleteBtn}
                onClick={confirmDeleteIncident}
                disabled={deletingIncidentId !== null}
              >
                {deletingIncidentId !== null ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Country</th>
              <th>Severity</th>
              <th>Source</th>
              <th>Date</th>
              <th>Coordinates</th>
              {isAdmin && <th className={styles.actionsCol}>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={isAdmin ? 9 : 8}>
                  No incidents found.
                </td>
              </tr>
            ) : (
              paginatedIncidents.map((incident) => (
                <tr key={incident.incident_id}>
                  <td className={styles.idCell}>{incident.incident_id}</td>
                  <td>{incident.title || "N/A"}</td>
                  <td>{getIncidentTypeName(incident)}</td>
                  <td>{incident.country || "N/A"}</td>
                  <td>{incident.severity || "N/A"}</td>
                  <td>{getIncidentSourceName(incident)}</td>
                  <td>{formatDate(getIncidentDate(incident))}</td>
                  <td>
                    {formatCoordinates(incident.latitude, incident.longitude)}
                  </td>
                  {isAdmin && (
                    <td className={styles.actions}>
                      <button
                        className={styles.deleteBtn}
                        disabled={deletingIncidentId === incident.incident_id}
                        onClick={() => openDeleteDialog(incident)}
                      >
                        {deletingIncidentId === incident.incident_id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredIncidents.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {startIndex + 1}-{endIndex} of {totalRows} incidents
          </div>

          <div className={styles.paginationControls}>
            <label className={styles.rowsPerPage}>
              Rows per page
              <select
                className={styles.rowsSelect}
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <button
              className={styles.pageBtn}
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>

            <span className={styles.pageStatus}>
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              className={styles.pageBtn}
              disabled={safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;

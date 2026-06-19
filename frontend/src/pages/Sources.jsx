import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/Sources.module.css";
import { ThreeDot } from "react-loading-indicators";

const API_BASE_URL = "http://localhost:8000";

const Sources = () => {
  const [sources, setSources] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSourcesAndIncidents = async () => {
      try {
        const token = localStorage.getItem("token");

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [sourcesRes, incidentsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sources/`, { headers }),
          fetch(`${API_BASE_URL}/incidents/`, { headers }),
        ]);

        if (!sourcesRes.ok) {
          throw new Error("Failed to fetch sources");
        }

        if (!incidentsRes.ok) {
          throw new Error("Failed to fetch incidents");
        }

        const sourcesData = await sourcesRes.json();
        const incidentsData = await incidentsRes.json();

        setSources(sourcesData);
        setIncidents(incidentsData);
      } catch (err) {
        setError(err.message || "Failed to fetch sources");
      } finally {
        setLoading(false);
      }
    };

    fetchSourcesAndIncidents();
  }, []);

  const sourceRows = useMemo(() => {
    const incidentCounts = incidents.reduce((counts, incident) => {
      const sourceId = incident.source_id || incident.source?.source_id;

      if (!sourceId) return counts;

      counts[sourceId] = (counts[sourceId] || 0) + 1;
      return counts;
    }, {});

    return sources
      .map((source) => ({
        ...source,
        incidentCount: incidentCounts[source.source_id] || 0,
      }))
      .sort((a, b) => {
        if (b.incidentCount !== a.incidentCount) {
          return b.incidentCount - a.incidentCount;
        }

        return (a.source_name || "").localeCompare(b.source_name || "");
      });
  }, [sources, incidents]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">
          <ThreeDot
            variant="bounce"
            color="#00afff"
            size="large"
            text="Loading sources..."
            textColor="white"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="loading">
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Ingested Sources</h2>
          <p className={styles.subtitle}>
            List of all sources used to ingest incident data, along with their reliability and update frequency.
          </p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Update Frequency</th>
              <th>Reliability</th>
              <th className={styles.numberCell}>Incidents Covered</th>
            </tr>
          </thead>

          <tbody>
            {sourceRows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan="5">
                  No sources found.
                </td>
              </tr>
            ) : (
              sourceRows.map((source) => (
                <tr key={source.source_id}>
                  <td>
                    {source.source_url ? (
                      <a
                        className={styles.sourceLink}
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.source_name || "N/A"}
                      </a>
                    ) : (
                      source.source_name || "N/A"
                    )}
                  </td>
                  <td>{source.source_type || "N/A"}</td>
                  <td>{source.update_frequency || "N/A"}</td>
                  <td>
                    {source.reliability_score !== null &&
                    source.reliability_score !== undefined
                      ? `${source.reliability_score}/100`
                      : "N/A"}
                  </td>
                  <td className={styles.numberCell}>
                    {source.incidentCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sources;
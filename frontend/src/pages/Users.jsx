import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "../styles/Users.module.css";
import { ThreeDot } from "react-loading-indicators";
import {isValidEmail, isValidPassword} from "../utils/validation";
const API_URL = "http://localhost:8000";

const getToken = () => localStorage.getItem("token");

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const userIdOf = (user) => user.user_id || user.id;

const makeDraft = (user) => ({
  username: user.username || "",
  email: user.email || "",
  role_id: user.role_id || "",
  is_active: Boolean(user.is_active),
  password: "",
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/users/`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/roles/`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const usersData = usersRes.data;
      const rolesData = rolesRes.data;

      setUsers(usersData);
      setRoles(rolesData);

      const initialDrafts = {};
      usersData.forEach((user) => {
        initialDrafts[userIdOf(user)] = makeDraft(user);
      });

      setDrafts(initialDrafts);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateDraft = (userId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  };

  const resetUser = (user) => {
    const userId = userIdOf(user);

    setDrafts((current) => ({
      ...current,
      [userId]: makeDraft(user),
    }));
  };

  const validateUserDraft = (draft) => {
    if (!draft.username.trim()) {
      return "Username is required";
    }

    if (!draft.email.trim()) {
      return "Email is required";
    }

    if (!isValidEmail(draft.email.trim())) {
      return "Enter a valid email address";
    }

    if(!isValidPassword(draft.password.trim()) && draft.password.trim() !== "") {
      return "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number";
    }

    return null;
  };


  const saveUser = async (user) => {
    const userId = userIdOf(user);
    const draft = drafts[userId];

    setSavingUserId(userId);
    setError("");
    setMessage("");

    try {
      const validationError = validateUserDraft(draft);
      if (validationError) {
        setError(validationError);
        return;
      }
      const payload = {
        username: draft.username,
        email: draft.email,
        role_id: Number(draft.role_id),
        is_active: draft.is_active,
      };

      if (draft.password.trim()) {
        payload.password = draft.password.trim();
      }

      const res = await axios.patch(`${API_URL}/users/${userId}`, payload, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });

      const updatedUser = res.data;

      setUsers((current) =>
        current.map((existingUser) =>
          userIdOf(existingUser) === userId ? updatedUser : existingUser,
        ),
      );

      setDrafts((current) => ({
        ...current,
        [userId]: makeDraft(updatedUser),
      }));

      setMessage(`Updated ${updatedUser.username}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to update user",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">
          <ThreeDot
            variant="bounce"
            color="#00afff"
            size="large"
            text="Loading users..."
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
          <h2 className={styles.title}>Users</h2>
          <p className={styles.subtitle}>
            Manage user accounts, roles and account status
          </p>
        </div>

        <button className={styles.refreshBtn} onClick={loadData}>
          Refresh
        </button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {message && <div className={styles.successBox}>{message}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>New Password</th>
              <th className={styles.actionsCol}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan="7">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const userId = userIdOf(user);
                const draft = drafts[userId] || makeDraft(user);
                const isSaving = savingUserId === userId;

                return (
                  <tr key={userId}>
                    <td className={styles.idCell}>{userId}</td>

                    <td>
                      <input
                        className={styles.input}
                        value={draft.username}
                        onChange={(event) =>
                          updateDraft(userId, "username", event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className={styles.input}
                        type="email"
                        value={draft.email}
                        onChange={(event) =>
                          updateDraft(userId, "email", event.target.value)
                        }
                      />
                    </td>

                    <td>
                      <select
                        className={styles.select}
                        value={draft.role_id}
                        onChange={(event) =>
                          updateDraft(userId, "role_id", event.target.value)
                        }
                      >
                        <option disabled value="">Select role</option>
                        {roles.map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.role_name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <label className={styles.activeLabel}>
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) =>
                            updateDraft(
                              userId,
                              "is_active",
                              event.target.checked,
                            )
                          }
                        />
                        Active
                      </label>
                    </td>

                    <td>
                      <input
                        className={styles.input}
                        type="password"
                        placeholder="Leave blank to keep"
                        value={draft.password}
                        onChange={(event) =>
                          updateDraft(userId, "password", event.target.value)
                        }
                      />
                    </td>

                    <td className={styles.actions}>
                      <button
                        className={styles.saveBtn}
                        disabled={isSaving}
                        onClick={() => saveUser(user)}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>

                      <button
                        className={styles.resetBtn}
                        disabled={isSaving}
                        onClick={() => resetUser(user)}
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
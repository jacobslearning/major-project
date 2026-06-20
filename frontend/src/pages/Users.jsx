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

const emptyNewUser = {
  username: "",
  email: "",
  role_id: "",
  is_active: true,
  password: "",
}

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [creating, setCreating] = useState(false);

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

  const updateNewUser = (field, value) => {
    setNewUser((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const closeCreateDialog = () => {
    setNewUser(emptyNewUser);
    setShowCreateDialog(false);
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

    if(!draft.role_id) {
      return "Role is required";
    }

    return null;
  };


  const saveUser = async (user) => {
    const userId = userIdOf(user);
    const draft = drafts[userId];

    setSavingUserId(userId);
    setError("");
    setMessage("");
    console.log(draft)

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

  const createUser = async (event) => {
    event.preventDefault();

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const validationError = validateUserDraft(newUser);

      if (validationError) {
        setError(validationError);
        return;
      }

      const payload = {
        username: newUser.username.trim(),
        email: newUser.email.trim(),
        password: newUser.password.trim(),
        role_id: Number(newUser.role_id),
        is_active: newUser.is_active,
      };

      const res = await axios.post(`${API_URL}/users/`, payload, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });

      const createdUser = res.data;
      const createdUserId = userIdOf(createdUser);

      setUsers((current) => [...current, createdUser]);

      setDrafts((current) => ({
        ...current,
        [createdUserId]: makeDraft(createdUser),
      }));

      setMessage(`Created ${createdUser.username}`);
      closeCreateDialog();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to create user",
      );
    } finally {
      setCreating(false);
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

        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={loadData}>
            Refresh
          </button>

          <button
            className={styles.addUserBtn}
            onClick={() => setShowCreateDialog(true)}
          >
            + User
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {message && <div className={styles.successBox}>{message}</div>}

      {showCreateDialog && (
        <div className={styles.dialogBackdrop} onMouseDown={closeCreateDialog}>
          <form
            className={styles.dialog}
            onSubmit={createUser}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <h3 className={styles.dialogTitle}>Create User</h3>
                <p className={styles.dialogSubtitle}>
                  Add a new user account and assign a role.
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
                <span>Username</span>
                <input
                  className={styles.input}
                  value={newUser.username}
                  onChange={(event) =>
                    updateNewUser("username", event.target.value)
                  }
                  placeholder="Enter username"
                />
              </label>

              <label className={styles.formField}>
                <span>Email</span>
                <input
                  className={styles.input}
                  type="email"
                  value={newUser.email}
                  onChange={(event) => updateNewUser("email", event.target.value)}
                  placeholder="Enter email"
                />
              </label>

              <label className={styles.formField}>
                <span>Password</span>
                <input
                  className={styles.input}
                  type="password"
                  value={newUser.password}
                  onChange={(event) =>
                    updateNewUser("password", event.target.value)
                  }
                  placeholder="Enter password"
                />
              </label>

              <label className={styles.formField}>
                <span>Role</span>
                <select
                  className={styles.select}
                  value={newUser.role_id}
                  onChange={(event) =>
                    updateNewUser("role_id", event.target.value)
                  }
                >
                  <option disabled value="">
                    Select role
                  </option>
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.activeLabel}>
                <input
                  type="checkbox"
                  checked={newUser.is_active}
                  onChange={(event) =>
                    updateNewUser("is_active", event.target.checked)
                  }
                />
                Active
              </label>
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
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
    )}

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
import { jwtDecode } from "jwt-decode";

export const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { sub, role } = jwtDecode(token);

    return {
      username: sub || null,
      role: role || null,
    };
  } catch {
    return null;
  }
};

export const getUsername = () => getCurrentUser()?.username || null;

export const getRole = () => getCurrentUser()?.role || null;
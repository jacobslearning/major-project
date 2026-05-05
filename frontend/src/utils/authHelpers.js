import { jwtDecode } from "jwt-decode";

export const getUsername = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const { sub } = jwtDecode(token);
    return sub || null;
  } catch {
    return null;
  }
};

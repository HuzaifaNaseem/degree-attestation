/**
 * axiosClient.js — Axios instance with automatic JWT injection.
 * Token is read from localStorage on every request so it stays fresh after login.
 */
import axios from "axios";

// VITE_API_URL is read from frontend/.env — never hardcoded
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

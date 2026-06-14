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
  async (err) => {
    const cfg    = err.config || {};
    const status = err.response?.status;

    // Auto-retry cold-start gateway errors (free hosting tiers waking up).
    // 502/503/504 mean the request never reached the app, so retrying is safe.
    // Network errors are only retried for GET (idempotent) to avoid double-writes.
    const isGatewayWake = [502, 503, 504].includes(status);
    const isNetworkErr  = !err.response;
    const isGet         = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retry = cfg.__retry || 0;
    if ((isGatewayWake || (isNetworkErr && isGet)) && cfg.__retry < 3) {
      cfg.__retry += 1;
      await new Promise((r) => setTimeout(r, 2500));
      return api(cfg);
    }

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

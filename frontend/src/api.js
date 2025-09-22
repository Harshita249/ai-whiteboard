import axios from "axios";

// In production (Railway), we want relative /api paths.
// For local dev, set VITE_BACKEND_URL in frontend/.env = "http://127.0.0.1:8000/api"
const BASE = import.meta.env.VITE_BACKEND_URL || "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

export async function register(username, password) {
  return api.post("/register", { username, password });
}

export async function login(username, password) {
  return api.post("/login", { username, password });
}

export async function saveDiagram(data, token) {
  return api.post("/save", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listGallery() {
  return api.get("/gallery/");
}

export async function getDiagram(id) {
  return api.get(`/gallery/${id}`);
}

export async function aiCleanup(data) {
  return api.post("/ai/cleanup", data);
}

export default api;

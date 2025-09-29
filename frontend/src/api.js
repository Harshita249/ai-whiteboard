import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || ""; // set to "https://your-backend" in production if needed
const api = axios.create({ baseURL: BASE, timeout: 20000 });

// Auth
export function register(username, password) {
  return api.post("/api/register", { username, password });
}
export function login(username, password) {
  return api.post("/api/login", { username, password });
}

// Gallery/diagrams
export function saveDiagram(payload, token) {
  // payload = { title, data_json } (data_json should be stringified JSON if needed)
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return api.post("/api/gallery", payload, { headers });
}
export function listGallery() {
  return api.get("/api/gallery/");
}
export function getDiagram(id) {
  return api.get(`/api/gallery/${id}`);
}
export function deleteDiagram(id, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return api.delete(`/api/gallery/${id}`, { headers });
}

// AI cleanup (expects multipart/form-data)
export function aiCleanup(formData, token) {
  const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } : { "Content-Type": "multipart/form-data" };
  return api.post("/api/ai/cleanup", formData, { headers });
}

export default api;

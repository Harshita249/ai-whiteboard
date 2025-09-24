// frontend/src/api.js
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "";
// If BACKEND defined (like https://... ), ensure we call /api routes on it. Otherwise use relative /api
const BASE = BACKEND ? `${BACKEND.replace(/\/$/, "")}/api` : "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

// Auth
export async function register(username, password) {
  return api.post("/register", { username, password });
}
export async function login(username, password) {
  return api.post("/login", { username, password });
}

// Gallery
export async function listGallery() {
  return api.get("/gallery/");
}
export async function saveGalleryItem(payload, token) {
  // payload = { title, data_json }
  return api.post("/gallery/", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
export async function deleteGalleryItem(id, token) {
  return api.delete(`/gallery/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
export async function getGalleryItem(id) {
  return api.get(`/gallery/${id}`);
}

// AI
export async function aiCleanup(formData, token) {
  return api.post("/ai/cleanup", formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export default api;

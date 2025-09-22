import axios from "axios";

// If env variable is set, use it; otherwise default to relative "/api"
const BASE = import.meta.env.VITE_BACKEND_URL || "/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

// Auth APIs
export async function register(username, password) {
  return api.post("/register", { username, password });
}

export async function login(username, password) {
  return api.post("/login", { username, password });
}

// Gallery APIs
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

// AI Service
export async function aiCleanup(data) {
  return api.post("/ai/cleanup", data);
}

export default api;


import axios from 'axios';
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: BASE, timeout: 20000 });

export async function register(username,password){ return api.post('/api/register',{username,password}) }
export async function login(username,password){ return api.post('/api/login',{username,password}) }
export async function saveDiagram(data, token){ return api.post('/api/save', data, { headers: { Authorization: `Bearer ${token}` } }) }
export async function listGallery(){ return api.get('/api/gallery/') }
export async function getDiagram(id){ return api.get(`/api/gallery/${id}`) }
export async function aiCleanup(data){ return api.post('/api/ai/cleanup', data) }
export default api;

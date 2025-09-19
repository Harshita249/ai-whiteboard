export const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function postJson(path, payload, token=null) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getJson(path, token=null) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });
  return res.json();
}

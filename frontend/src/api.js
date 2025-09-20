// BACKEND (empty string means same origin -> single service deploy)
export const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

function prefix(path) {
  const base = BACKEND ? BACKEND.replace(/\/$/, "") : "";
  return `${base}/api${path}`;
}

export async function postJson(path, payload, token=null) {
  const res = await fetch(prefix(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  return res;
}

export async function getJson(path, token=null) {
  const res = await fetch(prefix(path), {
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });
  return res;
}

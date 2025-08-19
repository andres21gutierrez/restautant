const KEY = "app_session";

export function saveSession(sess) {
  localStorage.setItem(KEY, JSON.stringify(sess));
}
export function loadSession() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export function clearSession() { localStorage.removeItem(KEY); }
export function isAdmin(session) { return session?.role === "ADMIN"; }

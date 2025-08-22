// src/tauri.js
let invoke;

if (import.meta.env.TAURI) {
  invoke = (await import("./tauriInvoke.js")).default;
} else {
  invoke = (await import("./mockInvoke.js")).default;
}

export default invoke;

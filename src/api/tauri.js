import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export async function invoke(name, payload = {}) {
  try {
    return await tauriInvoke(name, payload);
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("invoke error:", name, msg);
    throw new Error(msg);
  }
}

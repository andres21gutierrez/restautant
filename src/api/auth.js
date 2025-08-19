import { invoke } from "./tauri";

/** @returns {Promise<import("../types").SessionView>} */
export function login({ username, password, tenant_id, branch_id }) {
  return invoke("login", { input: { username, password, tenant_id, branch_id } });
}

export function logout(sessionId) {
  return invoke("logout", { sessionId });
}

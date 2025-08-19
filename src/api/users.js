import { invoke } from "./tauri";

/** @returns {Promise<import("../types").UserView>} */
export function createUser(sessionId, payload) {
  return invoke("create_user", { sessionId, payload });
}

/** @returns {Promise<import("../types").Page>} */
export function listUsers({ sessionId, tenantId, branchId, search = "", page = 1, pageSize = 10, onlyActive = true }) {
  return invoke("list_users", { sessionId, tenantId, branchId, search, page, pageSize, onlyActive });
}

export function updateUser(sessionId, userId, changes) {
  return invoke("update_user", { sessionId, userId, changes });
}

export function toggleUserActive(sessionId, userId, active) {
  return invoke("toggle_user_active", { sessionId, userId, active });
}

export function getUserById(sessionId, userId) {
  return invoke("get_user_by_id", { sessionId, userId });
}

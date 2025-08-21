import { invoke } from "./tauri";

/** @returns {Promise<import("../types").ProductView>} */
export function createProduct(sessionId, payload) {
  return invoke("create_product", { sessionId, payload });
}

/** @returns {Promise<import("../types").Page>} */
export function listProducts({ sessionId, tenantId, branchId, search = "", page = 1, pageSize = 10 }) {
  return invoke("list_products", { sessionId, tenantId, branchId, search, page, pageSize });
}

export function updateProduct(sessionId, productId, changes) {
  return invoke("update_product", { sessionId, productId, changes });
}

export function getProductById(sessionId, productId) {
  return invoke("get_product_by_id", { sessionId, productId });
}

export function deleteProduct(sessionId, productId) {
  return invoke("delete_product", { sessionId, productId });
}

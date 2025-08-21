import { invoke } from "./tauri";

export function createOrder(sessionId, payload) {
  return invoke("create_order", { sessionId, payload });
}

export function listOrders({ sessionId, tenantId, branchId, status = "", page = 1, pageSize = 10 }) {
  return invoke("list_orders", { sessionId, tenantId, branchId, status, page, pageSize });
}

export function updateOrderStatus(sessionId, orderId, status) {
  return invoke("update_order_status", { sessionId, orderId, status });
}

export function getOrderById(sessionId, orderId) {
  return invoke("get_order_by_id", { sessionId, orderId });
}

export function printOrderReceipt(sessionId, orderId, receiptType) {
  return invoke("print_order_receipt", { sessionId, orderId, receiptType });
}

export function deleteOrder(sessionId, orderId) {
  return invoke("delete_order", { sessionId, orderId });
}
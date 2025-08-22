// src/api/reports.js
import { invoke } from "@tauri-apps/api/core";

export function reportSalesOverview({
  sessionId, tenantId, branchId, fromDate, toDate,
}) {
  return invoke("report_sales_overview", {
    sessionId,
    tenantId,
    branchId,
    fromDate,
    toDate,
  });
}

export function reportProfitAndLoss({
  sessionId, tenantId, branchId, fromDate, toDate,
}) {
  return invoke("report_profit_and_loss", {
    sessionId,
    tenantId,
    branchId,
    fromDate,
    toDate,
  });
}

export function expenseCreate(sessionId, payload) {
  // payload: { tenant_id, branch_id, description, amount, (opcional) category, (opcional) date }
  return invoke("expense_create", { sessionId, payload });
}

export function expenseDelete(sessionId, expenseId) {
  return invoke("expense_delete", { sessionId, expenseId });
}

export function expensesList({
  sessionId, tenantId, branchId, fromDate, toDate, page = 1, pageSize = 20,
}) {
  return invoke("expenses_list", {
    sessionId,
    tenantId,
    branchId,
    fromDate,
    toDate,
    page,
    page_size: pageSize,
  });
}

// --- Caja / Arqueo ---
export function cashOpenShift(sessionId, { tenantId, branchId, openingFloat }) {
  return invoke("cash_open_shift", {
    sessionId,
    tenantId,
    branchId,
    opening_float: openingFloat,
  });
}

export function cashGetActiveShift(sessionId, { tenantId, branchId }) {
  return invoke("cash_get_active_shift", {
    sessionId,
    tenantId,
    branchId,
  });
}

export function cashRegisterMovement(sessionId, { shiftId, kind, amount, note }) {
  return invoke("cash_register_movement", {
    sessionId,
    shift_id: shiftId,
    kind,
    amount,
    note,
  });
}

export function cashCloseShift(sessionId, { shiftId, notes }) {
  // Si tu backend dejó "denominations" opcional, mandamos arreglo vacío por simplicidad
  return invoke("cash_close_shift", {
    sessionId,
    shift_id: shiftId,
    denominations: [], // <- vacío (no contamos billetes)
    notes: notes || null,
  });
}

export function cashListShifts({
  sessionId, tenantId, branchId, fromDate, toDate, page = 1, pageSize = 20,
}) {
  return invoke("cash_list_shifts", {
    sessionId,
    tenantId,
    branchId,
    fromDate,
    toDate,
    page,
    page_size: pageSize,
  });
}

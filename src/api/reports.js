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

export function cashOpenShift(sessionId, { tenantId, branchId, openingFloat }) {
  return invoke("cash_open_shift", {
    sessionId,
    tenantId,
    branchId,
    openingFloat,
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
    shiftId,
    kind,
    amount,
    note,
  });
}

export function cashCloseShift(sessionId, { shiftId, notes }) {
  return invoke("cash_close_shift", {
    sessionId,
    shiftId,
    denominations: [],
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

export function cashListShiftsEnriched({
  sessionId, tenantId, branchId, fromDate, toDate, page = 1, pageSize = 20,
}) {
  return invoke("cash_list_shifts_enriched", {
    sessionId,
    tenantId,
    branchId,
    fromDate,
    toDate,
    page,
    page_size: pageSize,
  });
}
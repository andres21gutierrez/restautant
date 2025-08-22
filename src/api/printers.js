import { invoke } from "./tauri";

export function listPrinters() {
  return invoke("list_printers_cmd");
}

export async function printOrderTicket({ sessionId, orderId, receiptType, printer }) {
  return invoke("print_order_ticket",{ 
    sessionId,
    req: {
      order_id: orderId,
      receiptType,
      printer_name: printer?.name || null,
      printer_port: printer?.port || null,
    }
});
}
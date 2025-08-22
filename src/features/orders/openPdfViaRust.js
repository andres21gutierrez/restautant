import { jsPDF } from "jspdf";
import { invoke } from "@tauri-apps/api/tauri";

export async function openPdfViaRust(order, type = "customer") {
  const doc = new jsPDF({ unit: "mm", format: [58, 200] });
  let y = 8;
  doc.setFontSize(12);
  doc.text("EL TITI WINGS", 29, y, { align: "center" }); y += 6;
  doc.setFontSize(9);
  doc.text(`Pedido #: ${order.order_number}`, 4, y); y += 5;
  doc.text(`Fecha: ${new Date(order.created_at * 1000).toLocaleString()}`, 4, y); y += 5;
  doc.text("--------------------------------", 4, y); y += 5;
  (order.items || []).forEach(item => {
    doc.text(`${item.name}`, 4, y); y += 5;
    doc.text(`${item.quantity} x ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}`, 4, y); y += 6;
  });
  doc.text("--------------------------------", 4, y); y += 5;
  doc.text(`TOTAL: Bs ${order.total?.toFixed(2) || "0.00"}`, 4, y);

  const dataUrl = doc.output("datauristring");
  const label = `ticket-${order.order_number}-${type}`;

  try {
    await invoke("open_pdf_window", { pdf_data_url: encodeURIComponent(dataUrl), label });
  } catch (e) {
    console.error(e);
    // fallback: abrir en ventana normal si invoke falla
    window.open(`pdf-viewer.html?pdf=${encodeURIComponent(dataUrl)}`, "_blank", "width=420,height=700");
  }
}
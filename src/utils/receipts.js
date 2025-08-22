// src/utils/receipts.js

export function buildCustomerReceipt(order) {
  return `
    <div class="center bold">EL TITI WINGS</div>
    <div class="line"></div>
    <div>Pedido #: ${order.order_number}</div>
    <div>Fecha: ${new Date(order.created_at * 1000).toLocaleString()}</div>
    <div class="line"></div>
    <div class="bold">PRODUCTO      CANT   PRECIO</div>
    ${order.items.map(it => `
      <div>
        ${it.name} x${it.quantity}
        <span class="right">Bs ${(it.price * it.quantity).toFixed(2)}</span>
      </div>
    `).join("")}
    <div class="line"></div>
    <div class="right bold">TOTAL: Bs ${order.total.toFixed(2)}</div>
    ${order.payment_method === "CASH" ? `
      <div>Efectivo: Bs ${(order.cash_amount ?? 0).toFixed(2)}</div>
      <div>Cambio: Bs ${(order.cash_change ?? 0).toFixed(2)}</div>
    ` : ""}
    <div class="line"></div>
    <div>Método de pago: ${order.payment_method}</div>
    ${order.delivery ? `
      <div>Delivery: ${order.delivery.company || ""}</div>
      ${order.delivery.address ? `<div>Dirección: ${order.delivery.address}</div>` : ""}
      ${order.delivery.phone ? `<div>Teléfono: ${order.delivery.phone}</div>` : ""}
    ` : ""}
    ${order.comments ? `<div>Comentarios: ${order.comments}</div>` : ""}
    <div class="line"></div>
    <div class="center">¡Gracias por su compra!</div>
  `;
}

export function buildKitchenReceipt(order) {
  return `
    <div class="center bold">COCINA - PEDIDO</div>
    <div class="line"></div>
    <div>Pedido #: ${order.order_number}</div>
    <div>Fecha: ${new Date(order.created_at * 1000).toLocaleString()}</div>
    <div class="line"></div>
    <div class="bold">PRODUCTO      CANT</div>
    ${order.items.map(it => `
      <div>${it.name} x${it.quantity}</div>
    `).join("")}
    <div class="line"></div>
    ${order.delivery ? `<div>Para delivery: ${order.delivery.company || ""}</div>` : ""}
    ${order.comments ? `<div>Comentarios: ${order.comments}</div>` : ""}
  `;
}

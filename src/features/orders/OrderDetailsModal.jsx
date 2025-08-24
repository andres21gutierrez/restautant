// src/features/orders/OrderDetailsModal.jsx
import React, { useEffect, useState } from "react";
import { getOrderById, printOrderReceipt } from "../../api/orders";
import { toast } from "sonner";
import {
  XMarkIcon,
  PrinterIcon,
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

function StatusPill({ status }) {
  const map = {
    PENDING: ["bg-amber-100 text-amber-800", "Pendiente"],
    IN_PROGRESS: ["bg-blue-100 text-blue-800", "En preparación"],
    READY: ["bg-violet-100 text-violet-800", "Listo"],
    DELIVERED: ["bg-emerald-100 text-emerald-800", "Despachado"],
    CANCELLED: ["bg-rose-100 text-rose-800", "Cancelado"],
  };
  const [klass, label] = map[status] || ["bg-gray-100 text-gray-700", status];
  return <span className={`text-xs px-2 py-0.5 rounded-full ${klass}`}>{label}</span>;
}

function PayMethod({ method }) {
  if (method === "CASH") return (
    <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
      <BanknotesIcon className="w-4 h-4" /> Efectivo
    </span>
  );
  if (method === "CARD") return (
    <span className="inline-flex items-center gap-1 text-sm text-sky-700">
      <CreditCardIcon className="w-4 h-4" /> Tarjeta
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-sm text-purple-700">
      <QrCodeIcon className="w-4 h-4" /> QR
    </span>
  );
}

export default function OrderDetailsModal({ open, orderId, sessionId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // limpiar al cerrar
  useEffect(() => { if (!open) setOrder(null); }, [open]);

  useEffect(() => {
    if (!open || !orderId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getOrderById(sessionId, orderId);
        setOrder(data);
      } catch (err) {
        toast.error(err?.message || "No se pudo cargar el pedido");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orderId, sessionId]);

  if (!open) return null;

  const total = order?.items?.reduce((t, it) => t + Number(it.price) * Number(it.quantity), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div>
            <div className="text-sm text-gray-600">Pedido #</div>
            <div className="text-xl font-semibold text-[#2d2d2d]">
              {order?.order_number ?? "—"}{" "}
              {order && <StatusPill status={order.status} />}
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100"
            title="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" /> Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-gray-600">Cargando…</div>
          ) : !order ? (
            <div className="text-gray-500">No se encontró el pedido.</div>
          ) : (
            <>
              {/* Info básica */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Fecha de creación</div>
                  <div className="text-sm text-[#2d2d2d]">
                    {new Date(order.created_at * 1000).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Método de pago</div>
                  <div className="text-sm">
                    <PayMethod method={order.payment_method} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-medium text-[#2d2d2d] mb-2">Detalle</h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2">Producto</th>
                        <th className="text-right px-3 py-2">Cant.</th>
                        <th className="text-right px-3 py-2">Precio</th>
                        <th className="text-right px-3 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((it) => (
                        <tr key={it.product_id} className="border-t">
                          <td className="px-3 py-2">{it.name}</td>
                          <td className="px-3 py-2 text-right">{it.quantity}</td>
                          <td className="px-3 py-2 text-right">Bs {Number(it.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            Bs {(Number(it.price) * Number(it.quantity)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr className="border-t">
                        <td colSpan={3} className="px-3 py-2 text-right font-medium">TOTAL</td>
                        <td className="px-3 py-2 text-right font-semibold">Bs {total.toFixed(2)}</td>
                      </tr>
                      {order.payment_method === "CASH" && (
                        <>
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right text-gray-600">Efectivo</td>
                            <td className="px-3 py-2 text-right">
                              Bs {(order.cash_amount ?? 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right text-gray-600">Cambio</td>
                            <td className="px-3 py-2 text-right">
                              Bs {(order.cash_change ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Delivery */}
              {order.delivery && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-[#2d2d2d] font-medium mb-1">
                    <TruckIcon className="w-4 h-4" /> Delivery
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-gray-600">Empresa:</span> {order.delivery.company || "—"}</div>
                    <div><span className="text-gray-600">Teléfono:</span> {order.delivery.phone || "—"}</div>
                    <div className="sm:col-span-3"><span className="text-gray-600">Dirección:</span> {order.delivery.address || "—"}</div>
                  </div>
                </div>
              )}

              {/* Comentarios */}
              {order.comments && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Comentarios</div>
                  <div className="text-sm text-[#2d2d2d] whitespace-pre-wrap">{order.comments}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          {order?.status !== "CANCELLED" && (
            <div>
              <button
                onClick={async () => {
                  try {
                    await printOrderReceipt(sessionId, orderId, "kitchen");
                    toast.success("Imprimiendo (cocina)...");
                  } catch (e) { toast.error(e?.message || "No se pudo imprimir"); }
                }}
                className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <PrinterIcon className="w-5 h-5" />
                Cocina
              </button>
              <button
                onClick={async () => {
                  try {
                    await printOrderReceipt(sessionId, orderId, "customer");
                    toast.success("Imprimiendo (cliente)...");
                  } catch (e) { toast.error(e?.message || "No se pudo imprimir"); }
                }}
                className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <PrinterIcon className="w-5 h-5" />
                Cliente
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="bg-[#3A7D44] hover:bg-[#2F6236] text-white rounded-lg px-4 py-2 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

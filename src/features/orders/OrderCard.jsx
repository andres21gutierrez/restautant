import React, { useMemo } from "react";
import {
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

function formatMoney(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "Bs 0.00";
  return `Bs ${v.toFixed(2)}`;
}
function formatTime(ts) {
  // ts puede venir en epoch (segundos) o ms; normalizamos
  let d;
  if (!ts) return "—";
  if (ts > 1e12) d = new Date(ts);           
  else d = new Date(ts * 1000);              
  return d.toLocaleString();
}
function pmIcon(pm) {
  if (pm === "CASH")  return <BanknotesIcon className="w-4 h-4" />;
  if (pm === "CARD")  return <CreditCardIcon className="w-4 h-4" />;
  if (pm === "QR")    return <QrCodeIcon className="w-4 h-4" />;
  return null;
}

export default function OrderCard({
  order,
  onDispatch,
  onCancel,
  onPrint,
  showActions = true,
  canceled = false,
  onClick
}) {
  const num = order.number || order.order_number || order.seq || "—";
  const created = order.created_at || order.createdAt || order.created;
  const items = order.items || [];
  const pm = order.payment_method || order.paymentMethod || "CASH";
  const cashAmount = order.cash_amount ?? order.cashAmount ?? null;
  const total = useMemo(() => {
    return items.reduce((t, it) => t + Number(it.price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  const isDelivery = !!order.delivery;
  const delivery = order.delivery || {};
  const change = pm === "CASH" && cashAmount ? Math.max(0, Number(cashAmount) - total) : 0;

  return (
    <div className={`rounded-xl border overflow-hidden ${canceled ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"} shadow-sm`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${canceled ? "border-red-200" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${canceled ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
            N°{num}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
            {formatTime(created)}
          </span>
        </div>
        {!canceled && (<div className="flex items-center gap-2">
          <button
            onClick={() => onPrint?.(order.id, "KITCHEN")}
            className="inline-flex cursor-pointer items-center gap-1 text-xs border rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-50"
            title="Imprimir cocina"
          >
            <PrinterIcon className="w-4 h-4" />
            Cocina
          </button>
          <button
            onClick={() => onPrint?.(order.id, "CLIENT")}
            className="inline-flex cursor-pointer items-center gap-1 text-xs border rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-50"
            title="Imprimir cliente"
          >
            <PrinterIcon className="w-4 h-4" />
            Cliente
          </button>
        </div>
    )}
      </div>

      <div className="p-3">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#2d2d2d] truncate">
                  x{it.quantity || 1} — {it.name || it.product_name || "Producto"}
                </div>
                {it.note || it.observations ? (
                  <div className="text-xs text-gray-600 mt-0.5">
                    {it.note || it.observations}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-gray-700 whitespace-nowrap">
                {formatMoney((it.price || 0) * (it.quantity || 0))}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-gray-500">— Sin ítems —</div>
          )}
        </div>

        <div onClick={onClick} className="mt-3 cursor-pointer border-t pt-2 flex items-center justify-between">
          <div className={`text-sm text-gray-700 flex ${pm === "CASH" ? "flex-col" : "items-center gap-1"}`}>
            <div className="inline-flex items-center gap-1">
              {pmIcon(pm)}
              <span className="uppercase">
                {pm === "CASH" ? "EFECTIVO" : pm === "CARD" ? "TARJETA" : pm}
              </span>
            </div>
            
            {pm === "CASH" && cashAmount != null && (
              <div className="text-gray-500 mt-1 flex flex-col items-start">
                Recibido: <strong>{formatMoney(cashAmount)}</strong>
                Cambio: <strong>{formatMoney(change)}</strong>
              </div>
            )}
          </div>
          <div className="text-base">
            <span className="text-gray-600 mr-2">Total:</span>
            <span className="font-semibold">{formatMoney(total)}</span>
          </div>
        </div>

        {/* Delivery */}
        {isDelivery && (
          <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-2">
            <div className="flex items-center gap-1 text-sm font-medium text-purple-800">
              <TruckIcon className="w-4 h-4" />
              Delivery
            </div>
            <div className="mt-1 text-xs text-purple-900/80 grid gap-0.5">
              {delivery.company && <div><strong>Empresa:</strong> {delivery.company}</div>}
              {delivery.phone && <div><strong>Tel.:</strong> {delivery.phone}</div>}
              {delivery.address && <div><strong>Dirección:</strong> {delivery.address}</div>}
            </div>
          </div>
        )}

        {/* Acciones */}
        {showActions && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="inline-flex cursor-pointer items-center gap-1.5 border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50"
              title="Cancelar pedido"
            >
              <XCircleIcon className="w-5 h-5" />
              Cancelar
            </button>
            <button
              onClick={onDispatch}
              className="inline-flex cursor-pointer items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700"
              title="Marcar como despachado"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Despachar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

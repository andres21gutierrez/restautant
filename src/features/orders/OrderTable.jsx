import React from "react";
import { PrinterIcon, TrashIcon } from "@heroicons/react/24/outline";
import { deleteOrder } from "../../api/orders";
import { toast } from "sonner";

const statusLabels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const paymentMethodLabels = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  QR: "QR",
};

export default function OrderTable({ rows, onStatusChange, onPrint, isAdmin, sessionId, refreshData }) {
  const handleStatusChange = (orderId, e) => {
    onStatusChange(orderId, e.target.value);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.")) {
      try {
        await deleteOrder(sessionId, orderId);
        toast.success("Pedido eliminado correctamente");
        refreshData();
      } catch (error) {
        toast.error(error.message || "Error al eliminar pedido");
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 px-3 font-medium">Número</th>
            <th className="py-2 px-3 font-medium">Items</th>
            <th className="py-2 px-3 font-medium">Total</th>
            <th className="py-2 px-3 font-medium">Método de pago</th>
            <th className="py-2 px-3 font-medium">Efectivo/Cambio</th>
            <th className="py-2 px-3 font-medium">Estado</th>
            <th className="py-2 px-3 font-medium">Delivery</th>
            <th className="py-2 px-3 font-medium">Comentarios</th>
            <th className="py-2 px-3 font-medium">Fecha</th>
            <th className="py-2 px-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50/60">
              <td className="py-2 px-3 font-medium">#{order.order_number}</td>
              <td className="py-2 px-3">
                <ul>
                  {order.items.map((item, index) => (
                    <li key={index}>{item.quantity}x {item.name} (${item.subtotal.toFixed(2)})</li>
                  ))}
                </ul>
              </td>
              <td className="py-2 px-3">${order.total.toFixed(2)}</td>
              <td className="py-2 px-3">{paymentMethodLabels[order.payment_method]}</td>
              <td className="py-2 px-3">
                {order.payment_method === "CASH" && (
                  <div>
                    <div>Entregado: ${order.cash_amount?.toFixed(2) || "0.00"}</div>
                    <div>Cambio: ${order.cash_change?.toFixed(2) || "0.00"}</div>
                  </div>
                )}
              </td>
              <td className="py-2 px-3">
                {isAdmin ? (
                  <select
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e)}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="IN_PROGRESS">En progreso</option>
                    <option value="READY">Listo</option>
                    <option value="DELIVERED">Entregado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                )}
              </td>
              <td className="py-2 px-3">
                {order.delivery ? order.delivery.company : "No"}
              </td>
              <td className="py-2 px-3">{order.comments || "-"}</td>
              <td className="py-2 px-3">
                {new Date(order.created_at * 1000).toLocaleString()}
              </td>
              <td className="py-2 px-3">
                <div className="flex gap-2 justify-end">
                  <button
                    className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
                    onClick={() => onPrint(order.id, 'customer')}
                    title="Imprimir para cliente"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Cliente
                  </button>
                  <button
                    className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
                    onClick={() => onPrint(order.id, 'kitchen')}
                    title="Imprimir para cocina"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Cocina
                  </button>
                  {isAdmin && (
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteOrder(order.id)}
                      title="Eliminar pedido"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="py-10 text-center text-gray-500">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
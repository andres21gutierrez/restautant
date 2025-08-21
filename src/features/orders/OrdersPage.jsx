import React, { useEffect, useMemo, useState } from "react";
import { loadSession, isAdmin } from "../../store/session";
import { listOrders, updateOrderStatus, printOrderReceipt } from "../../api/orders";
import OrderToolbar from "./OrderToolbar";
import OrderTable from "./OrderTable";
import OrderFormCreate from "./OrderFormCreate";
import { toast } from "sonner";
import { PlusIcon, PrinterIcon } from "@heroicons/react/24/outline";

const DELIVERY_COMPANIES = [
  "Correcaminos", "Encargos", "Te lo llevo", "Rapibol", "Sonic", 
  "Flash", "Coyotes", "Turbo", "Skiper", "Speed", "Puriskiry", 
  "Motoboy", "Telo llevo Falso", "Taz delivery"
];

export default function OrdersPage() {
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const tenantId = "T1";
  const branchId = "B1";
  const admin = isAdmin(session);

  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);

  async function fetchData() {
    setLoading(true); 
    setError("");
    try {
      const res = await listOrders({ 
        sessionId: session.session_id, 
        tenantId, 
        branchId, 
        status: statusFilter, 
        page, 
        pageSize 
      });
      setRows(res.data); 
      setTotal(res.total);
    } catch (err) {
      if (err.message?.includes("Sesión inválida") || err?.includes("Sesión inválida")) {
        localStorage.removeItem("app_session");
        window.location.href = "/login";
        return;
      }
      setError(err.message || "Error");
    } finally { 
      setLoading(false); 
    }
  }

  function handleStatusChange(orderId, newStatus) {
    updateOrderStatus(session.session_id, orderId, newStatus)
      .then(() => {
        fetchData();
        toast.success("Estado actualizado");
      })
      .catch(err => toast.error(err?.message || err));
  }

  function handlePrint(orderId, type) {
    printOrderReceipt(session.session_id, orderId, type)
      .then(() => toast.success("Imprimiendo..."))
      .catch(err => toast.error(err?.message || err));
  }

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Pedidos</h1>
        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-[#3A7D44] text-white px-3 py-2 hover:bg-[#2F6236] transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Pedido
        </button>
      </div>

      <OrderToolbar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <OrderTable
            rows={rows}
            onStatusChange={handleStatusChange}
            onPrint={handlePrint}
            isAdmin={admin}
          />
        )}

        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-sm text-gray-600">
            Total: <strong>{total}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40 hover:bg-gray-50"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">Página {page} de {pages}</span>
            <button
              className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40 hover:bg-gray-50"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <OrderFormCreate
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        tenantId={tenantId}
        branchId={branchId}
        sessionId={session.session_id}
        deliveryCompanies={DELIVERY_COMPANIES}
        onSubmitSuccess={() => {
          setOpenCreate(false);
          fetchData();
        }}
      />
    </div>
  );
}
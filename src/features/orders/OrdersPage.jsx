import React, { useEffect, useMemo, useState } from "react";
import { loadSession } from "../../store/session";
import { listOrders, updateOrderStatus, printOrderReceipt } from "../../api/orders";
import OrderFormCreate from "./OrderFormCreate";
import OrdersBoard from "./OrdersBoard";
import { toast } from "sonner";
import { PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import OrderDetailsModal from "./OrderDetailsModal";

const BOARD_PAGE_SIZE = 3;

function getTodayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function OrdersPage() {
  const session = loadSession();
  const tenantId = "ELTITI1";
  const branchId = "SUCURSAL1";

  const [pending, setPending]     = useState({ data: [], page: 1, total: 0 });
  const [delivered, setDelivered] = useState({ data: [], page: 1, total: 0 });
  const [canceled, setCanceled]   = useState({ data: [], page: 1, total: 0 });

  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [error, setError] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId]     = useState(null); 

  const [numberInput, setNumberInput] = useState("");
  const [dateInput, setDateInput]     = useState(getTodayStr());

  const [appliedOrderNumber, setAppliedOrderNumber] = useState(undefined);
  const [appliedDate, setAppliedDate]               = useState(getTodayStr());

  const usingNumber = useMemo(
    () => typeof appliedOrderNumber === "number" && Number.isFinite(appliedOrderNumber),
    [appliedOrderNumber]
  );

  async function fetchStatus(status, page, setter) {
    const res = await listOrders({
      sessionId: session.session_id,
      tenantId,
      branchId,
      status,
      page,
      pageSize: BOARD_PAGE_SIZE,
      orderNumber: appliedOrderNumber, 
      createdDate: appliedDate, 
    });
    
    setter({
      data: res.data || [],
      page: res.page || page,
      total: res.total || 0
    });
  }

  function openDetails(id) {
    setDetailsId(id);
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
    setDetailsId(null);
  }

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([
        fetchStatus("PENDING",   pending.page,   setPending),
        fetchStatus("DELIVERED", delivered.page, setDelivered),
        fetchStatus("CANCELLED", canceled.page,  setCanceled),
      ]);
    } catch (err) {
      if (String(err).includes("Sesión inválida")) {
        localStorage.removeItem("app_session");
        window.location.href = "/login";
        return;
      }
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [pending.page, delivered.page, canceled.page, appliedOrderNumber, appliedDate]);

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(session.session_id, orderId, newStatus);
      toast.success("Estado actualizado");
      fetchAll();
    } catch (err) {
      toast.error(err?.message || String(err));
    }
  }

  async function handlePrint(orderId, type) {
    try {
      await printOrderReceipt(session.session_id, orderId, type);
      toast.success("Imprimiendo…");
    } catch (err) {
      toast.error(err?.message || String(err));
    }
  }

  function handleSearch() {
    const trimmed = numberInput.trim();
    const parsed = trimmed ? parseInt(trimmed, 10) : NaN;

    setAppliedOrderNumber(!Number.isNaN(parsed) ? parsed : undefined);
    setAppliedDate(dateInput || getTodayStr());

    console.log("Búsqueda aplicada: " + parsed, dateInput)
    setPending(p   => ({ ...p, page: 1 }));
    setDelivered(p => ({ ...p, page: 1 }));
    setCanceled(p  => ({ ...p, page: 1 }));
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Pedidos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
            title="Actualizar"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-[#3A7D44] text-white px-3 py-2 hover:bg-[#2F6236] transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Nuevo Pedido
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border flex flex-wrap gap-2 items-center">
        <input
          type="number"
          placeholder="Número de pedido"
          value={numberInput}
          onChange={e => setNumberInput(e.target.value)}
          className="border rounded-lg px-3 py-2 w-48"
        />
        <input
          type="date"
          value={dateInput}
          onChange={e => setDateInput(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleSearch}
          className="bg-[#5B2A86] cursor-pointer hover:bg-[#502675] text-white px-4 py-2 rounded-lg"
        >
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <OrdersBoard
            pending={pending}
            delivered={delivered}
            canceled={canceled}
            perPage={BOARD_PAGE_SIZE}
            searchingByNumber={Number.isFinite(appliedOrderNumber)}
            onPageChange={{
              pending:   (p) => setPending(prev   => ({ ...prev,   page: p })),
              delivered: (p) => setDelivered(prev => ({ ...prev, page: p })),
              canceled:  (p) => setCanceled(prev  => ({ ...prev,  page: p })),
            }}
            onDispatch={(id) => handleStatusChange(id, "DELIVERED")}
            onCancel={(id) => handleStatusChange(id, "CANCELLED")}
            onPrint={handlePrint}
            onOpenDetails={openDetails}
          />
        )}
      </div>

      <OrderFormCreate
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        tenantId={tenantId}
        branchId={branchId}
        sessionId={session.session_id}
        onSubmitSuccess={() => {
          fetchAll();
        }}
 
      />

      <OrderDetailsModal
        open={detailsOpen}
        orderId={detailsId}
        sessionId={session.session_id}
        onClose={closeDetails}
      />
    </div>
  );
}

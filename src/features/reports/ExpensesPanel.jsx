import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadSession, isAdmin } from "../../store/session";
import { expensesList, expenseCreate, expenseDelete } from "@/api/reports";


function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function ExpensesPanel() {
  const session = loadSession();
  const tenantId = session?.tenant_id || "ELTITI1";
  const branchId = session?.branch_id || "SUCURSAL1";
  const admin = isAdmin(session);

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate]     = useState(todayStr());
  const [page, setPage]         = useState(1);
  const [pageSize]              = useState(10);

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [openNew, setOpenNew]   = useState(false);
  const [amount, setAmount]     = useState("");
  const [desc, setDesc]         = useState("");

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function fetchData() {
    setLoading(true); setError("");
    try {
      const res = await expensesList({
        sessionId: session.session_id,
        tenantId,
        branchId,
        fromDate,
        toDate,
        page,
        pageSize,
      });
      setRows(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [fromDate, toDate, page]);

  async function handleCreate(e) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Monto inválido");
      return;
    }
    if (!desc.trim()) {
      toast.error("Descripción requerida");
      return;
    }
    try {
      await expenseCreate({
        sessionId: session.session_id,
        payload: {
          tenant_id: tenantId,
          branch_id: branchId,
          description: desc.trim(),
          amount: val,
        },
      });
      toast.success("Egreso registrado");
      setOpenNew(false);
      setAmount("");
      setDesc("");
      setPage(1);
      fetchData();
    } catch (err) {
      toast.error(err?.message || String(err));
    }
  }

  async function handleDelete(id) {
    if (!admin) return;
    if (!window.confirm("¿Eliminar egreso?")) return;
    try {
      await expenseDelete({ sessionId: session.session_id, expenseId: id });
      toast.success("Egreso eliminado");
      fetchData();
    } catch (err) {
      toast.error(err?.message || String(err));
    }
  }

  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div>
          <label className="block text-sm text-gray-600">Desde</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={fromDate}
            onChange={e => { setPage(1); setFromDate(e.target.value); }}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Hasta</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={toDate}
            onChange={e => { setPage(1); setToDate(e.target.value); }}
          />
        </div>
        <div className="ml-auto">
          <button
            className="bg-[#3A7D44] text-white rounded-lg px-3 py-2"
            onClick={() => setOpenNew(true)}
          >
            Nuevo egreso
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-gray-600">Cargando…</div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 px-2">Fecha</th>
                <th className="py-2 px-2">Descripción</th>
                <th className="py-2 px-2">Monto</th>
                <th className="py-2 px-2 w-10 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500">Sin egresos</td>
                </tr>
              ) : rows.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2 px-2">
                    {new Date(e.date || e.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 px-2">{e.description}</td>
                  <td className="py-2 px-2 font-semibold">Bs {Number(e.amount).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    {admin && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex justify-between items-center mt-3 text-sm">
            <span>Total: {total}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className={`px-2 py-1 rounded ${page <= 1 ? "text-gray-400" : "text-blue-600 hover:underline"}`}
              >
                Anterior
              </button>
              <span>Página {page} de {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className={`px-2 py-1 rounded ${page >= pages ? "text-gray-400" : "text-blue-600 hover:underline"}`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal nuevo egreso */}
      {openNew && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Registrar egreso</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descripción</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monto (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpenNew(false)} className="border rounded-lg px-3 py-2">
                Cancelar
              </button>
              <button type="submit" className="bg-[#3A7D44] text-white rounded-lg px-3 py-2">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

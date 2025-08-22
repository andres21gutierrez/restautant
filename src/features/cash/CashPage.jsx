// src/features/cash/CashPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadSession } from "../../store/session";
import {
  cashOpenShift,
  cashGetActiveShift,
  cashRegisterMovement,
  cashCloseShift,
  cashListShifts,
} from "@/api/reports";

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function fmtMoney(n) {
  const x = Number(n || 0);
  return `Bs ${x.toFixed(2)}`;
}

const DEFAULT_DENOMS = [
  { value: 200, qty: 0 },
  { value: 100, qty: 0 },
  { value: 50,  qty: 0 },
  { value: 20,  qty: 0 },
  { value: 10,  qty: 0 },
  { value: 5,   qty: 0 },
  { value: 2,   qty: 0 },
  { value: 1,   qty: 0 },
  { value: 0.5, qty: 0 },
];

export default function CashPage() {
  const session = loadSession();
  const tenantId = session?.tenant_id || "ELTITI1";
  const branchId = session?.branch_id || "SUCURSAL1";

  // Caja activa
  const [active, setActive] = useState(null);
  const [loadingActive, setLoadingActive] = useState(false);

  // Abrir caja
  const [openModal, setOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");

  // Registrar movimiento
  const [mvKind, setMvKind] = useState("IN");
  const [mvAmount, setMvAmount] = useState("");
  const [mvNote, setMvNote] = useState("");

  // Cerrar caja
  const [closeModal, setCloseModal] = useState(false);
  const [denoms, setDenoms] = useState(DEFAULT_DENOMS.map(d => ({ ...d })));
  const [notes, setNotes] = useState("");

  // Historial
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [histPage, setHistPage] = useState(1);
  const [histPageSize] = useState(10);
  const [history, setHistory] = useState({ data: [], total: 0 });
  const pages = useMemo(
    () => Math.max(1, Math.ceil((history.total || 0) / histPageSize)),
    [history.total, histPageSize]
  );

  async function refreshActive() {
    setLoadingActive(true);
    try {
      const sh = await cashGetActiveShift({
        sessionId: session.session_id,
        tenantId,
        branchId,
      });
      setActive(sh || null);
    } catch (err) {
      toast.error(err?.message || String(err));
    } finally {
      setLoadingActive(false);
    }
  }

  async function refreshHistory() {
    try {
      const res = await cashListShifts({
        sessionId: session.session_id,
        tenantId,
        branchId,
        fromDate,
        toDate,
        page: histPage,
        pageSize: histPageSize,
      });
      setHistory({ data: res.data || [], total: res.total || 0 });
    } catch (err) {
      toast.error(err?.message || String(err));
    }
  }

  useEffect(() => { refreshActive(); }, []);
  useEffect(() => { refreshHistory(); }, [fromDate, toDate, histPage]);

  // --- Abrir caja
  async function handleOpen(e) {
    e.preventDefault();
    const f = parseFloat(openingFloat);
    if (!f || f < 0) {
      toast.error("Monto de apertura inválido");
      return;
    }
    const tid = toast.loading("Abriendo caja…");
    try {
      await cashOpenShift({
        sessionId: session.session_id,
        tenantId,
        branchId,
        openingFloat: f,
      });
      toast.success("Caja abierta", { id: tid });
      setOpenModal(false);
      setOpeningFloat("");
      refreshActive();
      refreshHistory();
    } catch (err) {
      toast.error(err?.message || String(err), { id: tid });
    }
  }

  // --- Registrar IN/OUT
  async function handleMovement(e) {
    e.preventDefault();
    if (!active) {
      toast.error("No hay caja activa");
      return;
    }
    const amt = parseFloat(mvAmount);
    if (!amt || amt <= 0) {
      toast.error("Monto inválido");
      return;
    }
    const tid = toast.loading("Registrando movimiento…");
    try {
      await cashRegisterMovement({
        sessionId: session.session_id,
        shiftId: active.id,
        kind: mvKind,
        amount: amt,
        note: mvNote || undefined,
      });
      toast.success("Movimiento registrado", { id: tid });
      setMvAmount("");
      setMvNote("");
      refreshActive();
    } catch (err) {
      toast.error(err?.message || String(err), { id: tid });
    }
  }

  // --- Cerrar caja
  const counted = useMemo(
    () => denoms.reduce((sum, d) => sum + Number(d.value) * Number(d.qty || 0), 0),
    [denoms]
  );

  function setDenomQty(idx, qty) {
    setDenoms(prev => prev.map((d, i) => (i === idx ? { ...d, qty: qty || 0 } : d)));
  }
  function addDenomRow() {
    setDenoms(prev => [...prev, { value: 0, qty: 0 }]);
  }
  function setDenomValue(idx, value) {
    setDenoms(prev => prev.map((d, i) => (i === idx ? { ...d, value: parseFloat(value) || 0 } : d)));
  }
  function removeDenomRow(idx) {
    setDenoms(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleClose(e) {
    e.preventDefault();
    if (!active) {
      toast.error("No hay caja activa");
      return;
    }
    const clean = denoms
      .map(d => ({ value: Number(d.value) || 0, qty: parseInt(d.qty || 0, 10) || 0 }))
      .filter(d => d.value > 0 && d.qty >= 0);

    const tid = toast.loading("Cerrando caja…");
    try {
      const closed = await cashCloseShift({
        sessionId: session.session_id,
        shiftId: active.id,
        denominations: clean,
        notes: notes || undefined,
      });
      toast.success(
        `Caja cerrada. Contado: ${fmtMoney(closed.counted)} — Esperado: ${fmtMoney(closed.expected)} — Dif: ${fmtMoney(closed.difference)}`,
        { id: tid }
      );
      setCloseModal(false);
      setDenoms(DEFAULT_DENOMS.map(d => ({ ...d })));
      setNotes("");
      setActive(null);
      refreshHistory();
    } catch (err) {
      toast.error(err?.message || String(err), { id: tid });
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold text-[#2d2d2d]">Arqueo de caja</h1>

      {/* Caja activa / Apertura */}
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[#2d2d2d]">Estado de caja</h2>
          <button
            className="border rounded-lg px-3 py-1.5 hover:bg-gray-50"
            onClick={refreshActive}
          >
            Actualizar
          </button>
        </div>

        {loadingActive ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : active ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Info label="Estado" value={<Badge color="emerald">ABIERTA</Badge>} />
              <Info label="Usuario" value={active.username} />
              <Info label="Apertura" value={new Date(active.opened_at).toLocaleString()} />
              <Info label="Monto de apertura" value={fmtMoney(active.opening_float)} />
              <Info label="Movimientos IN/OUT" value={`${active.movements.filter(m => m.kind === "IN").length} / ${active.movements.filter(m => m.kind === "OUT").length}`} />
              <Info label="Nota" value={active.notes || "—"} />
            </div>

            {/* Form movimiento */}
            <div className="mt-5 border rounded-xl p-3">
              <h3 className="font-medium text-[#2d2d2d] mb-3">Registrar movimiento</h3>
              <form onSubmit={handleMovement} className="grid md:grid-cols-5 gap-2">
                <select
                  className="border rounded-lg px-3 py-2"
                  value={mvKind}
                  onChange={e => setMvKind(e.target.value)}
                >
                  <option value="IN">Ingreso</option>
                  <option value="OUT">Egreso</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto (Bs)"
                  className="border rounded-lg px-3 py-2"
                  value={mvAmount}
                  onChange={e => setMvAmount(e.target.value)}
                  required
                />
                <input
                  placeholder="Nota (opcional)"
                  className="border rounded-lg px-3 py-2 md:col-span-2"
                  value={mvNote}
                  onChange={e => setMvNote(e.target.value)}
                />
                <button className="bg-[#3A7D44] text-white rounded-lg px-3 py-2">Guardar</button>
              </form>

              {/* Lista movimientos */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Movimientos</h4>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 px-2">Fecha</th>
                        <th className="py-2 px-2">Tipo</th>
                        <th className="py-2 px-2">Monto</th>
                        <th className="py-2 px-2">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.movements.length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-gray-500">Sin movimientos</td></tr>
                      ) : active.movements
                        .slice()
                        .sort((a, b) => new Date(b.at) - new Date(a.at))
                        .map((m, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 px-2">{new Date(m.at).toLocaleString()}</td>
                            <td className="py-2 px-2">{m.kind === "IN" ? "Ingreso" : "Egreso"}</td>
                            <td className="py-2 px-2">{fmtMoney(m.amount)}</td>
                            <td className="py-2 px-2">{m.note || "—"}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Botón cerrar */}
            <div className="mt-4 flex justify-end">
              <button
                className="bg-purple-600 text-white rounded-lg px-4 py-2"
                onClick={() => setCloseModal(true)}
              >
                Cerrar caja
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 rounded-lg border border-dashed text-center">
            <p className="text-gray-700 mb-3">No hay caja abierta.</p>
            <button
              className="bg-[#3A7D44] text-white rounded-lg px-4 py-2"
              onClick={() => setOpenModal(true)}
            >
              Abrir caja
            </button>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <h2 className="text-lg font-semibold text-[#2d2d2d] mr-auto">Historial de arqueos</h2>
          <div>
            <label className="block text-sm text-gray-600">Desde</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={fromDate}
              onChange={e => { setHistPage(1); setFromDate(e.target.value); }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Hasta</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={toDate}
              onChange={e => { setHistPage(1); setToDate(e.target.value); }}
            />
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 px-2">Apertura</th>
                <th className="py-2 px-2">Cierre</th>
                <th className="py-2 px-2">Usuario</th>
                <th className="py-2 px-2">Apertura (Bs)</th>
                <th className="py-2 px-2">Contado (Bs)</th>
                <th className="py-2 px-2">Esperado (Bs)</th>
                <th className="py-2 px-2">Dif. (Bs)</th>
                <th className="py-2 px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">Sin registros</td>
                </tr>
              ) : history.data.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 px-2">{new Date(s.opened_at).toLocaleString()}</td>
                  <td className="py-2 px-2">{s.closed_at ? new Date(s.closed_at).toLocaleString() : "—"}</td>
                  <td className="py-2 px-2">{s.username}</td>
                  <td className="py-2 px-2">{fmtMoney(s.opening_float)}</td>
                  <td className="py-2 px-2">{s.counted != null ? fmtMoney(s.counted) : "—"}</td>
                  <td className="py-2 px-2">{s.expected != null ? fmtMoney(s.expected) : "—"}</td>
                  <td className={`py-2 px-2 ${s.difference && s.difference !== 0 ? "text-red-600 font-semibold" : ""}`}>
                    {s.difference != null ? fmtMoney(s.difference) : "—"}
                  </td>
                  <td className="py-2 px-2">
                    {s.status === "CLOSED" ? <Badge color="gray">CERRADA</Badge> : <Badge color="emerald">ABIERTA</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex justify-between items-center mt-3 text-sm">
          <span>Total: {history.total}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={histPage <= 1}
              onClick={() => setHistPage(p => p - 1)}
              className={`px-2 py-1 rounded ${histPage <= 1 ? "text-gray-400" : "text-blue-600 hover:underline"}`}
            >
              Anterior
            </button>
            <span>Página {histPage} de {pages}</span>
            <button
              disabled={histPage >= pages}
              onClick={() => setHistPage(p => p + 1)}
              className={`px-2 py-1 rounded ${histPage >= pages ? "text-gray-400" : "text-blue-600 hover:underline"}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal abrir caja */}
      {openModal && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <form onSubmit={handleOpen} className="bg-white rounded-2xl shadow p-5 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">Abrir caja</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monto de apertura</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpenModal(false)} className="border rounded-lg px-3 py-2">Cancelar</button>
              <button type="submit" className="bg-[#3A7D44] text-white rounded-lg px-3 py-2">Abrir</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal cerrar caja */}
      {closeModal && active && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <form onSubmit={handleClose} className="bg-white rounded-2xl shadow p-5 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-3">Cerrar caja</h3>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="border rounded-xl p-3">
                <h4 className="font-medium mb-2">Denominaciones</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {denoms.map((d, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded-lg px-3 py-1.5"
                          value={d.value}
                          onChange={e => setDenomValue(idx, e.target.value)}
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          className="w-full border rounded-lg px-3 py-1.5"
                          value={d.qty}
                          onChange={e => setDenomQty(idx, parseInt(e.target.value || 0, 10))}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeDenomRow(idx)}
                          className="text-red-600 hover:underline"
                          title="Quitar fila"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button type="button" onClick={addDenomRow} className="text-blue-600 hover:underline">
                    + Agregar fila
                  </button>
                </div>
              </div>

              <div className="border rounded-xl p-3">
                <h4 className="font-medium mb-2">Resumen</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Contado:</span>
                    <strong>{fmtMoney(counted)}</strong>
                  </div>
                  <div className="text-gray-600 text-xs">
                    * El esperado y diferencia se calcularán en el backend usando ventas en efectivo + movimientos.
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm text-gray-600 mb-1">Notas (opcional)</label>
                    <textarea
                      rows={4}
                      className="w-full border rounded-lg px-3 py-2"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setCloseModal(false)} className="border rounded-lg px-3 py-2">
                Cancelar
              </button>
              <button type="submit" className="bg-purple-600 text-white rounded-lg px-4 py-2">
                Cerrar caja
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-[#2d2d2d]">{value}</div>
    </div>
  );
}
function Badge({ color = "gray", children }) {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${map[color] || map.gray}`}>
      {children}
    </span>
  );
}

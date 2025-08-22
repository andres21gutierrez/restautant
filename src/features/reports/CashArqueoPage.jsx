// src/features/reports/CashArqueoPage.jsx
import React, { useEffect, useState } from "react";
import { loadSession } from "../../store/session";
import {
  cashOpenShift, cashGetActiveShift, cashRegisterMovement,
  cashCloseShift, cashListShifts,
} from "../../api/reports";
import { toast } from "sonner";
import { todayStr, monthStartStr } from "../../utils/date";
import { money } from "../../utils/money";

export default function CashArqueoPage() {
  const session = loadSession();
  const tenantId = session.tenant_id || "ELTITI1";
  const branchId = session.branch_id || "SUCURSAL1";

  const [active, setActive] = useState(null); // shift activo
  const [loadActive, setLoadActive] = useState(false);

  const [openAmount, setOpenAmount] = useState("");

  // movimientos manuales
  const [mvKind, setMvKind] = useState("IN");
  const [mvAmount, setMvAmount] = useState("");
  const [mvNote, setMvNote] = useState("");

  // históricos
  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());
  const [histRows, setHistRows] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const HIST_PAGE_SIZE = 10;

  // detalle modal
  const [detail, setDetail] = useState(null);

  async function refreshActive() {
    setLoadActive(true);
    try {
      const sh = await cashGetActiveShift(session.session_id, { tenantId, branchId });
      setActive(sh || null);
    } catch (e) {
      toast.error(e?.message || "Error obteniendo caja");
    } finally {
      setLoadActive(false);
    }
  }

  async function refreshHistory() {
    try {
      const res = await cashListShifts({
        sessionId: session.session_id,
        tenantId, branchId,
        fromDate, toDate,
        page: histPage, pageSize: HIST_PAGE_SIZE,
      });
      setHistRows(res?.data || []);
      setHistTotal(res?.total || 0);
    } catch (e) {
      toast.error(e?.message || "No se pudo listar arqueos");
    }
  }

  useEffect(() => {
    refreshActive();
  }, []);

  useEffect(() => { refreshHistory(); }, [fromDate, toDate, histPage]);

  async function onOpenShift(e) {
    e.preventDefault();
    if (!openAmount || Number(openAmount) < 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      await cashOpenShift(session.session_id, {
        tenantId, branchId, openingFloat: Number(openAmount),
      });
      toast.success("Caja abierta");
      setOpenAmount("");
      refreshActive();
    } catch (e) {
      toast.error(e?.message || "No se pudo abrir caja");
    }
  }

  async function onAddMovement(e) {
    e.preventDefault();
    if (!active) return;
    const amount = Number(mvAmount);
    if (!amount || amount <= 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      await cashRegisterMovement(session.session_id, {
        shiftId: active.id, kind: mvKind, amount, note: mvNote || null,
      });
      toast.success("Movimiento registrado");
      setMvAmount(""); setMvNote("");
      refreshActive();
    } catch (e) {
      toast.error(e || "No se pudo registrar movimiento");
    }
  }

  async function onCloseShift() {
    if (!active) return;
    if (!window.confirm("¿Cerrar caja?")) return;
    try {
      const res = await cashCloseShift(session.session_id, {
        shiftId: active.id,
        notes: null,
      });
      toast.success("Caja cerrada");
      setDetail(res); // mostrar detalle del cierre
      setActive(null);
      refreshHistory();
    } catch (e) {
      toast.error(e?.message || "No se pudo cerrar");
    }
  }

  const maxHistPage = Math.max(1, Math.ceil(histTotal / HIST_PAGE_SIZE));

  // totales manuales actuales
  let manualIn = 0, manualOut = 0;
  if (active?.movements?.length) {
    for (const m of active.movements) {
      if (m.kind === "IN") manualIn += m.amount;
      if (m.kind === "OUT") manualOut += m.amount;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Arqueo de caja</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                 className="border rounded-lg px-3 py-1.5"/>
          <span>—</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                 className="border rounded-lg px-3 py-1.5"/>
          <button onClick={refreshHistory} className="border rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Actualizar
          </button>
        </div>
      </header>

      {/* Caja activa / apertura */}
      <section className="bg-white border rounded-xl p-4 shadow-sm">
        {loadActive ? (
          <div className="text-gray-600">Cargando caja…</div>
        ) : active ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Caja activa</div>
                <div className="text-xl font-semibold">
                  {session.username} — {active.branch_id}
                </div>
                <div className="text-sm text-gray-600">
                  Apertura: {money(active.opening_float)} — {String(active.opened_at).slice(0,19).replace("T"," ")}
                </div>
              </div>
              <button onClick={onCloseShift}
                      className="bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700">
                Cerrar caja
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <Kpi label="Ingresos manuales" value={money(manualIn)} />
              <Kpi label="Egresos manuales" value={money(manualOut)} />
              <Kpi label="Movimientos" value={(active.movements || []).length} />
              <Kpi label="Estado" value={active.status} />
            </div>

            <form onSubmit={onAddMovement} className="mt-4 grid sm:grid-cols-5 gap-2">
              <select className="border rounded-lg px-3 py-2" value={mvKind} onChange={e => setMvKind(e.target.value)}>
                <option value="IN">Ingreso</option>
                <option value="OUT">Egreso</option>
              </select>
              <input type="number" step="0.01" className="border rounded-lg px-3 py-2"
                     placeholder="Monto" value={mvAmount} onChange={e => setMvAmount(e.target.value)} />
              <input className="border rounded-lg px-3 py-2 sm:col-span-2"
                     placeholder="Nota (opcional)" value={mvNote} onChange={e => setMvNote(e.target.value)} />
              <button className="bg-[#3A7D44] text-white rounded-lg px-4 py-2 hover:bg-[#2F6236]">
                Registrar
              </button>
            </form>

            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">Movimientos</div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left w-28">Fecha</th>
                      <th className="p-2 text-left w-24">Tipo</th>
                      <th className="p-2 text-right w-32">Monto</th>
                      <th className="p-2 text-left">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(active.movements || []).length === 0 ? (
                      <tr><td colSpan={4} className="p-3 text-center text-gray-500">Sin movimientos</td></tr>
                    ) : active.movements.map((m, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{String(m.at).slice(0,19).replace("T"," ")}</td>
                        <td className="p-2">{m.kind === "IN" ? "Ingreso" : "Egreso"}</td>
                        <td className={`p-2 text-right ${m.kind === "IN" ? "text-emerald-700" : "text-red-700"}`}>
                          {money(m.amount)}
                        </td>
                        <td className="p-2">{m.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={onOpenShift} className="flex items-end gap-2">
            <div>
              <div className="text-sm text-gray-600 mb-1">Monto de apertura</div>
              <input
                type="number" step="0.01"
                className="border rounded-lg px-3 py-2"
                placeholder="0.00"
                value={openAmount}
                onChange={e => setOpenAmount(e.target.value)}
                required
              />
            </div>
            <button className="bg-[#3A7D44] text-white rounded-lg px-4 py-2 hover:bg-[#2F6236]">
              Abrir caja
            </button>
          </form>
        )}
      </section>

      {/* Historial */}
      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500 mb-2">Historial de arqueos</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Fecha apertura</th>
                <th className="p-2 text-left">Fecha cierre</th>
                <th className="p-2 text-right">Apertura</th>
                <th className="p-2 text-right">Esperado</th>
                <th className="p-2 text-right">Contado</th>
                <th className="p-2 text-right">Diferencia</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {histRows.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">Sin arqueos</td></tr>
              ) : histRows.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{String(s.opened_at).slice(0,19).replace("T"," ")}</td>
                  <td className="p-2">{s.closed_at ? String(s.closed_at).slice(0,19).replace("T"," ") : "—"}</td>
                  <td className="p-2 text-right">{money(s.opening_float)}</td>
                  <td className="p-2 text-right">{s.expected != null ? money(s.expected) : "—"}</td>
                  <td className="p-2 text-right">{s.counted != null ? money(s.counted) : "—"}</td>
                  <td className={`p-2 text-right ${Number(s.difference||0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {s.difference != null ? money(s.difference) : "—"}
                  </td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2 text-right">
                    <button className="text-blue-600 hover:underline" onClick={() => setDetail(s)}>
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between p-2 border-t text-sm">
            <span>Total: {histTotal}</span>
            <div className="flex items-center gap-2">
              <button disabled={histPage <= 1}
                      onClick={() => setHistPage(p => p - 1)}
                      className="border rounded px-2 py-1 disabled:opacity-50">
                Anterior
              </button>
              <span>Página {histPage} de {Math.max(1, Math.ceil(histTotal / HIST_PAGE_SIZE))}</span>
              <button disabled={histPage >= maxHistPage}
                      onClick={() => setHistPage(p => p + 1)}
                      className="border rounded px-2 py-1 disabled:opacity-50">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Detalle de arqueo</div>
              <button onClick={() => setDetail(null)} className="border rounded px-3 py-1">Cerrar</button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Kpi label="Apertura" value={money(detail.opening_float)} />
              <Kpi label="Esperado" value={detail.expected != null ? money(detail.expected) : "—"} />
              <Kpi label="Contado" value={detail.counted != null ? money(detail.counted) : "—"} />
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              <Kpi label="Diferencia" value={detail.difference != null ? money(detail.difference) : "—"} />
              <Kpi label="Estado" value={detail.status} />
              <Kpi label="Usuario" value={detail.username} />
            </div>

            <div className="mt-4 text-sm text-gray-500">Movimientos</div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left w-28">Fecha</th>
                    <th className="p-2 text-left w-24">Tipo</th>
                    <th className="p-2 text-right w-32">Monto</th>
                    <th className="p-2 text-left">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.movements || []).length === 0 ? (
                    <tr><td colSpan={4} className="p-3 text-center text-gray-500">Sin movimientos</td></tr>
                  ) : detail.movements.map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{String(m.at).slice(0,19).replace("T"," ")}</td>
                      <td className="p-2">{m.kind === "IN" ? "Ingreso" : "Egreso"}</td>
                      <td className={`p-2 text-right ${m.kind === "IN" ? "text-emerald-700" : "text-red-700"}`}>
                        {money(m.amount)}
                      </td>
                      <td className="p-2">{m.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

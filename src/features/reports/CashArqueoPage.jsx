// src/features/reports/CashArqueoPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { loadSession } from "../../store/session";
import {
  cashOpenShift, cashGetActiveShift, cashRegisterMovement,
  cashCloseShift, cashListShiftsEnriched,
} from "../../api/reports";
import { toast } from "sonner";
import { todayStr, monthStartStr } from "../../utils/date";
import { money } from "../../utils/money";
import ConfirmDialog from "@/components/ConfirmDialog";
import html2pdf from "html2pdf.js";

/* ============ Helpers de fecha / formato seguros ============ */
const getMs = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (v.$date?.$numberLong) return Number(v.$date.$numberLong);
  if (v.$date) return Number(v.$date);
  return 0;
};
const fmtDateTime = (v) => {
  const ms = getMs(v);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/* ============ Sanitizador para exportar a PDF (evita oklch) ============ */
function cloneAndSanitizeNode(node) {
  const clone = node.cloneNode(true);

  // Recorre todos los elementos y fuerza estilos "seguros"
  const all = clone.querySelectorAll("*");
  all.forEach((el, idx) => {
    el.style.backgroundImage = "none";

    // intenta leer del original por índice aproximado
    // (suficiente para sanitizar colores problemáticos)
    const cs = window.getComputedStyle(el);
    const bg = cs.background || cs.backgroundColor || "";
    const fg = cs.color || "";

    if (bg.includes("oklch")) el.style.background = "#ffffff";
    if (fg.includes("oklch")) el.style.color = "#111827";

    if (!el.style.background || el.style.background === "initial" || el.style.background === "unset") {
      el.style.background = "#ffffff";
    }
    if (!el.style.color || el.style.color === "initial" || el.style.color === "unset") {
      el.style.color = "#111827";
    }
    el.style.borderColor ||= "#e5e7eb";
    el.style.boxShadow = "none";
    el.style.filter = "none";
  });

  clone.style.background = "#ffffff";
  return clone;
}

/* ============ KPIs sencillos ============ */
function Kpi({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${label === "Ingreso total" ? "text-green-600" : label === "Egreso total" ? "text-red-600" : ""}`}>{value}</div>
    </div>
  );
}

export default function CashArqueoPage() {
  const session = loadSession();
  const tenantId = session.tenant_id || "ELTITI1";
  const branchId = session.branch_id || "SUCURSAL1";

  const [active, setActive] = useState(null);
  const [loadActive, setLoadActive] = useState(false);

  const [openAmount, setOpenAmount] = useState("");

  const [mvKind, setMvKind] = useState("IN");
  const [mvAmount, setMvAmount] = useState("");
  const [mvNote, setMvNote] = useState("");

  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());
  const [histRows, setHistRows] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const HIST_PAGE_SIZE = 10;

  const [detail, setDetail] = useState(null);

  const [confirmMvOpen, setConfirmMvOpen] = useState(false);
  const [confirmMvLoading, setConfirmMvLoading] = useState(false);

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmCloseLoading, setConfirmCloseLoading] = useState(false);

  // Ref del bloque que exportaremos a PDF
  const printRef = useRef(null);

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
      const res = await cashListShiftsEnriched({
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

  useEffect(() => { refreshActive(); }, []);
  useEffect(() => { refreshHistory(); }, [fromDate, toDate, histPage]);

  async function onOpenShift(e) {
    try {
      await cashOpenShift(session.session_id, { tenantId, branchId, openingFloat: 300 });
      toast.success("Caja abierta");
      setOpenAmount("");
      refreshActive();
    } catch (e) {
      toast.error(e?.message || "No se pudo abrir caja");
    }
  }

  function onAddMovement(e) {
    e.preventDefault();
    if (!active) return;
    const amount = Number(mvAmount);
    if (!amount || amount <= 0) {
      toast.error("Monto inválido");
      return;
    }
    setConfirmMvOpen(true);
  }

  async function confirmAddMovement() {
    if (!active) return;
    const amount = Number(mvAmount);
    setConfirmMvLoading(true);
    try {
      const shiftId = active._id?.$oid || active.id;
      await cashRegisterMovement(session.session_id, {
        shiftId,
        kind: mvKind,
        amount,
        note: mvNote || null,
      });
      toast.success("Movimiento registrado");
      setMvAmount("");
      setMvNote("");
      setConfirmMvOpen(false);
      refreshActive();
    } catch (e) {
      toast.error(e?.message || "No se pudo registrar movimiento");
    } finally {
      setConfirmMvLoading(false);
    }
  }

  function onCloseShift() {
    if (!active) return;
    setConfirmCloseOpen(true);
  }

  async function confirmCloseShift() {
    if (!active) return;
    setConfirmCloseLoading(true);
    try {
      const shiftId = active._id?.$oid || active.id;
      const res = await cashCloseShift(session.session_id, { shiftId, notes: null });
      toast.success("Caja cerrada");
      setActive(null);
      setConfirmCloseOpen(false);
      refreshHistory();
    } catch (e) {
      toast.error(e?.message || "No se pudo cerrar la caja");
    } finally {
      setConfirmCloseLoading(false);
    }
  }

  const maxHistPage = Math.max(1, Math.ceil(histTotal / HIST_PAGE_SIZE));

  let manualIn = 0, manualOut = 0;
  if (active?.movements?.length) {
    for (const m of active.movements) {
      if (m.kind === "IN") manualIn += m.amount;
      if (m.kind === "OUT") manualOut += m.amount;
    }
  }

  /* ============ PDF ============ */
  async function downloadPdf() {
    const src = printRef.current;
    if (!src) return;
    const clean = cloneAndSanitizeNode(src);

    // contenedor temporal fuera de pantalla
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-99999px";
    holder.style.top = "0";
    holder.style.background = "#ffffff";
    holder.appendChild(clean);
    document.body.appendChild(holder);

    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `arqueo_${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: { backgroundColor: "#ffffff", scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      };
      await html2pdf().from(clean).set(opt).save();
    } finally {
      document.body.removeChild(holder);
    }
  }

  /* ============ Render ============ */
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
                  Apertura: {money(active.opening_float)} — {fmtDateTime(active.opened_at)}
                </div>
              </div>
              <button onClick={onCloseShift}
                      className="bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700">
                Cerrar caja
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <Kpi label="Ingreso total" value={money(manualIn)} />
              <Kpi label="Egreso total" value={money(manualOut)} />
              <Kpi label="Movimientos" value={(active.movements || []).length} />
              <Kpi label="Estado" value={active.status === "OPEN" ? "CAJA ACTIVA" : "CAJA INACTIVA"} />
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
                        <td className="p-2">{fmtDateTime(m.at)}</td>
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
                type="number"
                step="0.01"
                className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                value={300}
                readOnly
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
                <th className="p-2 text-right">Ingresos</th>
                <th className="p-2 text-right">Egresos</th>
                <th className="p-2 text-right">Neto diario</th>
                <th className="p-2 text-right">Estado</th>
                <th className="p-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {histRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">Sin arqueos</td>
                </tr>
              ) : histRows.map(s => {
                  const openedAt = fmtDateTime(s.opened_at);
                  const closedAt = fmtDateTime(s.closed_at);
                  const cashSales  = Number(s.cash_sales ?? 0);
                  const manualIns  = Number(s.manual_ins ?? 0);
                  const manualOuts = Number(s.manual_outs ?? 0);

                  const ingresos = cashSales + manualIns;
                  const egresos  = manualOuts;
                  const neto     = ingresos - egresos;

                  return (
                    <tr key={s.id || s._id?.$oid} className="border-t">
                      <td className="p-2">{openedAt}</td>
                      <td className="p-2">{closedAt}</td>
                      <td className="p-2 text-right">{money(s.opening_float)}</td>
                      <td className="p-2 text-right text-emerald-700">{money(ingresos)}</td>
                      <td className="p-2 text-right text-red-700">{money(egresos)}</td>
                      <td className={`p-2 text-right ${neto >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {money(neto)}
                      </td>
                      <td className="p-2 text-right">{s.status === "OPEN" ? "ABIERTO" : "CERRADO"}</td>
                      <td className="p-2 text-right">
                        <button
                          className="text-white cursor-pointer bg-green-700 hover:bg-green-900 px-2 py-1 rounded-sm"
                          onClick={() => setDetail(s)}
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Modal de DETALLE: una sola lista + PDF */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-4xl">
            {/* Header modal */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">Arqueo del día</div>
                <div className="text-sm text-gray-600">
                  Apertura: <strong>{fmtDateTime(detail.opened_at)}</strong>
                  {" · "}Cierre: <strong>{fmtDateTime(detail.closed_at)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/*<button
                  onClick={downloadPdf}
                  className="bg-[#5B2A86] text-white rounded-md px-3 py-1.5 hover:opacity-90"
                >
                  Descargar PDF
                </button>*/}
                <button onClick={() => setDetail(null)} className="border rounded px-3 py-1.5">
                  Cerrar
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid md:grid-cols-4 gap-3 mb-3">
              <Kpi label="Apertura" value={money(Number(detail.opening_float || 0))} />
              <Kpi label="Ingreso total" value={money(Number(detail.manual_ins || 0) + Number(detail.cash_sales || 0))} />
              <Kpi label="Egreso total" value={money(Number(detail.manual_outs || 0))} />
              <Kpi
                label="Ingreso neto del día"
                value={money(
                  (Number(detail.manual_ins || 0) + Number(detail.cash_sales || 0)) -
                  Number(detail.manual_outs || 0)
                )}
              />
            </div>

            <div ref={printRef}>
              <div className="rounded-xl border overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b font-medium">Detalle</div>
                <div className="max-h-[55vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left w-20">Tipo</th>
                        <th className="p-2 text-left w-20">Pedido</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-left w-28">Pago</th>
                        <th className="p-2 text-right w-28">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(detail.movements) && detail.movements.length > 0 ? (
                        detail.movements.map((m, i) => {
                          const isIn = m.kind === "IN";
                          const o = m.order || null;
                          const pedido = o?._id?.$oid ? `#${o.order_number}` : "—";
                          const metodo = o?.payment_method || (m.source === "MANUAL" ? "MANUAL" : "—");
                          const items = Array.isArray(o?.items) && o.items.length
                            ? o.items.map(it => `${it.name} x${it.quantity}`).join(", ")
                            : (m.note || "—");
                          const cashInfo = o?.payment_method === "CASH"
                            ? `Recibido: ${money(o.cash_amount || 0)} | Cambio: ${money(o.cash_change || 0)}`
                            : "";

                          return (
                            <tr key={i} className="border-t align-top">
                              <td className={`p-2 font-medium ${isIn ? "text-emerald-700" : "text-red-700"}`}>
                                {isIn ? "Ingreso" : "Egreso"}
                              </td>
                              <td className="p-2">{pedido}</td>
                              <td className="p-2">
                                <div className="whitespace-pre-line">{items}</div>
                                {cashInfo && (
                                  <div className="text-xs text-gray-500">{cashInfo}</div>
                                )}
                              </td>
                              <td className="p-2">
                                {metodo === "CASH" ? "EFECTIVO" :
                                 metodo === "CARD" ? "TARJETA" :
                                 metodo === "QR"   ? "QR" :
                                 metodo}
                              </td>
                              <td className={`p-2 text-right ${isIn ? "text-emerald-700" : "text-red-700"}`}>
                                {money(m.amount)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-gray-500">Sin movimientos</td>
                        </tr>
                      )}
                      {/* Fila total al final */}
                      <tr className="border-t bg-gray-50">
                        <td className="p-2 font-semibold" colSpan={3}>Total</td>
                        <td className="p-2 text-right font-medium">Neto</td>
                        <td className="p-2 text-right font-semibold">
                          {money(
                            (Number(detail.manual_ins || 0) + Number(detail.cash_sales || 0)) -
                            Number(detail.manual_outs || 0)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmMvOpen}
        title={mvKind === "IN" ? "Confirmar ingreso" : "Confirmar egreso"}
        message={
          (mvKind === "IN"
            ? "Vas a registrar un INGRESO en caja."
            : "Vas a registrar un EGRESO en caja."
          ) + "\n\nAsegúrate de que el monto y la nota sean correctos, "
            + "porque luego no podrás eliminar este movimiento del arqueo.\n\nDebes estar seguro de este registro."
        }
        confirmText="Registrar"
        cancelText="Cancelar"
        danger={mvKind === "OUT"}
        loading={confirmMvLoading}
        onConfirm={confirmAddMovement}
        onCancel={() => setConfirmMvOpen(false)}
      />

      <ConfirmDialog
        open={confirmCloseOpen}
        title="Confirmar cierre de caja"
        message={
          "¿Estás seguro de cerrar la caja?\n\n"
          + "Se calculará el arqueo total con los pedidos del día y movimientos manuales. "
          + "No podrás registrar más movimientos hasta abrir una nueva caja."
        }
        confirmText="Cerrar caja"
        cancelText="Cancelar"
        danger
        loading={confirmCloseLoading}
        onConfirm={confirmCloseShift}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </div>
  );
}

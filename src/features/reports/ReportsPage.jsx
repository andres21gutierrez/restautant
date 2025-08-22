import React, { useEffect, useMemo, useState } from "react";
import { loadSession } from "../../store/session";
import { todayStr, monthStartStr } from "../../utils/date";
import { money } from "../../utils/money";
import { toast } from "sonner";
import { cashListShiftsEnriched, expensesList } from "../../api/reports";
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

// 🔒 Fondo fijo de apertura que se mantiene en la caja (no se suma por caja)
const OPENING_BASE_BS = 300;

export default function ReportsPage() {
  const session = loadSession();
  const tenantId = session?.tenant_id || "ELTITI1";
  const branchId = session?.branch_id || "SUCURSAL1";

  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());

  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState([]);      // cajas enriquecidas
  const [otherExp, setOtherExp] = useState(0); // otros egresos del rango

  const EXP_PAGE_SIZE = 100;
  const [expTotalCount, setExpTotalCount] = useState(0);

  useEffect(() => {
    fetchAll();
  }, [fromDate, toDate]);

  async function fetchAll() {
    setLoading(true);
    try {
      // 1) Cajas enriquecidas
      const resBoxes = await cashListShiftsEnriched({
        sessionId: session.session_id,
        tenantId, branchId,
        fromDate, toDate,
        page: 1,
        pageSize: 500,
      });
      setBoxes(resBoxes?.data || []);

      // 2) Otros egresos (sumatoria)
      let page = 1;
      let sum = 0;
      let total = 0;
      while (true) {
        const resExp = await expensesList({
          sessionId: session.session_id,
          tenantId, branchId,
          fromDate, toDate,
          page,
          pageSize: EXP_PAGE_SIZE,
        });
        const rows = resExp?.data || [];
        total = resExp?.total || 0;
        for (const e of rows) sum += Number(e.amount || 0);
        if (page * EXP_PAGE_SIZE >= total || rows.length === 0) break;
        page += 1;
      }
      setOtherExp(sum);
      setExpTotalCount(total);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  }

  // Helpers BSON Date -> ms & formato
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
      hour: "2-digit", minute: "2-digit"
    });
  };

  // Mapeo por caja (ingresos/egresos NO incluyen la apertura fija)
  const boxesComputed = useMemo(() => {
    return (boxes || []).map((s, idx) => {
      const cashSales  = Number(s.cash_sales ?? 0);
      const manualIns  = Number(s.manual_ins ?? 0);
      const manualOuts = Number(s.manual_outs ?? 0);
      const ingresos   = cashSales + manualIns;
      const egresos    = manualOuts;
      const neto       = ingresos - egresos;

      return {
        key: s.id || s._id?.$oid || `box-${idx}`,
        openedAtLabel: fmtDateTime(s.opened_at),
        closedAtLabel: s.closed_at ? fmtDateTime(s.closed_at) : "—",
        opening_float: Number(s.opening_float || 0), // informativo (ej. 300)
        cash_sales: cashSales,
        manual_ins: manualIns,
        manual_outs: manualOuts,
        ingresos,
        egresos,
        neto,
        status: s.status,
        username: s.username,
      };
    });
  }, [boxes]);

  // Totales del rango (por cajas)
  const totals = useMemo(() => {
    let tIngresos = 0, tEgresos = 0, tNeto = 0;
    for (const b of boxesComputed) {
      tIngresos += b.ingresos;
      tEgresos  += b.egresos;
      tNeto     += b.neto;
    }

    // ✅ La apertura es un fondo fijo de 300 Bs (no se suma por caja)
    const aperturaFija = OPENING_BASE_BS;

    // “Históricos”: se muestran como Ingresos/Egresos + apertura fija
    const ingresosHistoricos = tIngresos + aperturaFija;
    const egresosHistoricos  = - tEgresos  + aperturaFija;

    // Estado de cuentas = Neto de cajas − Otros egresos (expenses)
    const estadoCuentas = tNeto - otherExp;

    return {
      tIngresos,
      tEgresos,
      tNeto,
      aperturaFija,
      ingresosHistoricos,
      egresosHistoricos,
      otrosEgresos: otherExp,
      estadoCuentas
    };
  }, [boxesComputed, otherExp]);

  // Datos gráficas
  const chartData = useMemo(() => {
    return (boxesComputed || []).map(b => ({
      caja: b.openedAtLabel,
      ingresos: b.ingresos,
      egresos: b.egresos,
      neto: b.neto,
    }));
  }, [boxesComputed]);

  return (
    <div className="p-4 space-y-4">
      {/* Filtros */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Reportes por Caja</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            className="border rounded-lg px-3 py-1.5"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
          <button
            onClick={fetchAll}
            className="border rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="grid md:grid-cols-5 gap-3">
          <Kpi label="Cajas en rango" value={boxesComputed.length} />
          <Kpi label="Ingreso historico total" value={money(totals.tIngresos)} />
          <Kpi label="Egreso historico total" value={`${money(totals.tEgresos)}`} />
          <Kpi label="Neto historico" value={
            <span className={totals.tNeto >= 0 ? "text-emerald-700" : "text-red-700"}>
              {money(totals.tNeto)}
            </span>
          } />
          <Kpi label="Apertura fija" value={money(totals.aperturaFija)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Kpi label="Ingresos históricos (ingresos + apertura fija)" value={money(totals.ingresosHistoricos)} />
          <Kpi label="Egresos históricos (egresos + apertura fija)" value={money(totals.egresosHistoricos)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Kpi label="Estado de cuentas (finanzas totales)" value={
            <span className={(totals.aperturaFija + totals.tIngresos - totals.tEgresos) >= 0 ? "text-emerald-700" : "text-red-700"}>
              {money(totals.aperturaFija + totals.tIngresos - totals.tEgresos)}
            </span>
          } />
        </div>
      </section>

      {/* Gráficas */}
      <section className="grid lg:grid-cols-2 gap-4">
        <Card title="Ingresos vs Egresos por Caja">
          {loading ? (
            <div className="text-gray-600 p-6">Cargando…</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="caja" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ingresos" stackId="a" />
                  <Bar dataKey="egresos" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Neto por Caja">
          {loading ? (
            <div className="text-gray-600 p-6">Cargando…</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="caja" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="neto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Tabla */}
      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="text-sm text-gray-500 mb-2">Cajas del rango</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Apertura</th>
                <th className="p-2 text-left">Cierre</th>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-right">Apertura Bs</th>
                <th className="p-2 text-right">Ingresos</th>
                <th className="p-2 text-right">Egresos</th>
                <th className="p-2 text-right">Neto</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-3 text-center text-gray-500">Cargando…</td></tr>
              ) : boxesComputed.length === 0 ? (
                <tr><td colSpan={8} className="p-3 text-center text-gray-500">Sin cajas</td></tr>
              ) : boxesComputed.map(b => (
                <tr key={b.key} className="border-t">
                  <td className="p-2">{b.openedAtLabel}</td>
                  <td className="p-2">{b.closedAtLabel}</td>
                  <td className="p-2">{b.username}</td>
                  <td className="p-2 text-right">{money(b.opening_float)}</td>
                  <td className="p-2 text-right text-emerald-700">{money(b.ingresos)}</td>
                  <td className="p-2 text-right text-red-700">{money(b.egresos)}</td>
                  <td className={`p-2 text-right ${b.neto >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(b.neto)}
                  </td>
                  <td className="p-2">{b.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-2" colSpan={3}>Totales (cajas)</td>
                <td className="p-2 text-right">{money(totals.aperturaFija)}</td>
                <td className="p-2 text-right">{money(totals.tIngresos)}</td>
                <td className="p-2 text-right">{money(totals.tEgresos)}</td>
                <td className="p-2 text-right">{money(totals.tNeto)}</td>
                <td className="p-2"></td>
              </tr>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-2" colSpan={3}>Totales ingresos - egresos + apertura fija</td>
                <td></td>
                <td></td>
                <td></td>
                <td
                  className={`p-2 text-right ${
                    totals.aperturaFija + totals.tIngresos - totals.tEgresos >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {money(totals.aperturaFija + totals.tIngresos - totals.tEgresos)}
                </td>
                <td className="p-2"></td>
              </tr>
              
            </tfoot>
          </table>
        </div>

      </section>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Kpi({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      {children}
    </section>
  );
}

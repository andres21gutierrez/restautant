import React, { useEffect, useState } from "react";
import { loadSession } from "../../store/session";
import {
  reportSalesOverview,
  reportProfitAndLoss,
  expenseCreate,
  expenseDelete,
  expensesList,
} from "../../api/reports";
import { toast } from "sonner";
import { todayStr, monthStartStr } from "../../utils/date";
import { money } from "../../utils/money";

import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#5B2A86", "#3A7D44", "#F59E0B", "#0EA5E9", "#EF4444", "#10B981"];

export default function ReportsPage() {
  const session = loadSession();
  const tenantId = session.tenant_id || "ELTITI1";
  const branchId = session.branch_id || "SUCURSAL1";

  const [fromDate, setFromDate] = useState(monthStartStr());
  const [toDate, setToDate] = useState(todayStr());

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [overview, setOverview] = useState({
    total_sales: 0, orders: 0, avg_ticket: 0,
    by_method: [], by_category: [], timeseries: [], top_products: [],
  });

  const [pnl, setPnl] = useState({
    ingresos: 0, egresos: 0, neto: 0, ingresos_series: [], egresos_series: [],
  });

  // egresos form + listado
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDate, setExpDate] = useState(todayStr());

  const [expRows, setExpRows] = useState([]);
  const [expTotal, setExpTotal] = useState(0);
  const [expPage, setExpPage] = useState(1);
  const EXP_PAGE_SIZE = 10;

  async function fetchAll() {
    setLoading(true);
    setErr("");
    try {
      const [ov, pl, el] = await Promise.all([
        reportSalesOverview({
          sessionId: session.session_id,
          tenantId, branchId, fromDate, toDate,
        }),
        reportProfitAndLoss({
          sessionId: session.session_id,
          tenantId, branchId, fromDate, toDate,
        }),
        expensesList({
          sessionId: session.session_id,
          tenantId, branchId, fromDate, toDate,
          page: expPage, pageSize: EXP_PAGE_SIZE,
        }),
      ]);

      setOverview(ov || overview);
      setPnl(pl || pnl);
      setExpRows(el?.data || []);
      setExpTotal(el?.total || 0);
    } catch (e) {
      console.error(e);
      setErr(e?.message || String(e));
      toast.error(e?.message || "Error cargando reportes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, expPage]);

  async function onAddExpense(e) {
    e.preventDefault();
    if (!expDesc || !expAmount) {
      toast.error("Llena descripción y monto");
      return;
    }
    try {
      await expenseCreate(session.session_id, {
        tenant_id: tenantId,
        branch_id: branchId,
        description: expDesc,
        amount: Number(expAmount),
        category: expCategory || null,
        date: expDate || todayStr(),
      });
      toast.success("Egreso registrado");
      setExpDesc(""); setExpAmount(""); setExpCategory("");
      setExpDate(todayStr());
      setExpPage(1);
      fetchAll();
    } catch (e) {
      toast.error(e?.message || "No se pudo registrar egreso");
    }
  }

  async function onDeleteExpense(id) {
    if (!window.confirm("¿Eliminar este egreso?")) return;
    try {
      await expenseDelete(session.session_id, id);
      toast.success("Egreso eliminado");
      fetchAll();
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  }

  const maxExpPage = Math.max(1, Math.ceil(expTotal / EXP_PAGE_SIZE));

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Reportes</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                 className="border rounded-lg px-3 py-1.5"/>
          <span>—</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                 className="border rounded-lg px-3 py-1.5"/>
          <button onClick={fetchAll}
                  className="border rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Actualizar
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-6 text-gray-600">Cargando…</div>
      ) : err ? (
        <div className="p-6 text-red-600">{err}</div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid md:grid-cols-3 gap-4">
            <Card title="Ventas totales" value={money(overview.total_sales)} />
            <Card title="Órdenes" value={overview.orders} />
            <Card title="Ticket promedio" value={money(overview.avg_ticket)} />
          </section>

          {/* Gráficas */}
          <section className="grid xl:grid-cols-2 gap-4">
            <ChartCard title="Ingresos por día">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={overview.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#5B2A86" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ingresos por método de pago">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overview.by_method}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ingresos por categoría">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Pie data={overview.by_category} dataKey="amount" nameKey="category" outerRadius={100}>
                    {overview.by_category.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top productos (cantidad)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overview.top_products}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="qty" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          {/* Pérdidas y ganancias */}
          <section className="grid xl:grid-cols-2 gap-4">
            <Card title="Pérdidas y Ganancias">
              <div className="grid grid-cols-3 gap-3 mt-2">
                <SmallStat label="Ingresos" value={money(pnl.ingresos)} />
                <SmallStat label="Egresos" value={money(pnl.egresos)} />
                <SmallStat label="Neto" value={money(pnl.neto)} highlight={pnl.neto >= 0 ? "pos" : "neg"} />
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line data={pnl.ingresos_series} dataKey="amount" name="Ingresos" stroke="#10B981" />
                    <Line data={pnl.egresos_series} dataKey="amount" name="Egresos" stroke="#EF4444" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Egresos: alta + listado */}
            <Card title="Egresos">
              <form onSubmit={onAddExpense} className="grid md:grid-cols-4 gap-2 mt-2">
                <input
                  className="border rounded-lg px-3 py-2 col-span-2"
                  placeholder="Descripción"
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  type="number" step="0.01" placeholder="Monto"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Categoría (opcional)"
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  type="date" value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                />
                <div className="md:col-start-4">
                  <button className="w-full bg-[#3A7D44] text-white rounded-lg px-3 py-2 hover:bg-[#2F6236]">
                    Agregar
                  </button>
                </div>
              </form>

              <div className="mt-3 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expRows.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin egresos</td></tr>
                    ) : expRows.map(e => (
                      <tr key={e.id} className="border-t">
                        <td className="p-2">{(e.date || e.created_at || "").slice(0,10)}</td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2 text-right">{money(e.amount)}</td>
                        <td className="p-2 text-right">
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => onDeleteExpense(e.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between p-2 border-t text-sm">
                  <span>Total: {expTotal}</span>
                  <div className="flex items-center gap-2">
                    <button disabled={expPage <= 1}
                            onClick={() => setExpPage(p => p - 1)}
                            className="border rounded px-2 py-1 disabled:opacity-50">
                      Anterior
                    </button>
                    <span>Página {expPage} de {maxExpPage}</span>
                    <button disabled={expPage >= maxExpPage}
                            onClick={() => setExpPage(p => p + 1)}
                            className="border rounded px-2 py-1 disabled:opacity-50">
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ title, value, children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      {value !== undefined && <div className="text-2xl font-semibold mt-1">{value}</div>}
      {children}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function SmallStat({ label, value, highlight }) {
  const cls =
    highlight === "pos" ? "text-emerald-700 bg-emerald-50" :
    highlight === "neg" ? "text-red-700 bg-red-50" :
    "text-gray-800 bg-gray-50";
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

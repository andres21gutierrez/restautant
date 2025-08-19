import React, { useMemo } from "react";
import { Link } from "react-router-dom";

// Carga de sesión desde localStorage
const SESSION_KEY = "app_session";
const roleToUi = (r) => (r === "SELLER" ? "CAJERO" : r);

export default function Home() {
  const session = useMemo(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const uiRole = roleToUi(session?.role || "");
  const username = session?.username || "Usuario";

  return (
    <div className="space-y-6">
      {/* Encabezado sobrio */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#2d2d2d]">
          ¡Hola, {username}!
        </h1>
        <p className="text-gray-600 mt-1">
          Rol:{" "}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              uiRole === "ADMIN"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {uiRole || "—"}
          </span>{" "}
          &nbsp;•&nbsp; Sucursal: <strong>{session?.branch_id || "—"}</strong>
        </p>
      </section>

      {/* Atajos rápidos */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Pedidos */}
        <Link
          to="/orders"
          className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Pedidos</h3>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              Ir →
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            Crear y gestionar pedidos del día.
          </p>
          <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
            Abrir módulo
          </div>
        </Link>

        {/* Usuarios (solo ADMIN) */}
        {session?.role === "ADMIN" && (
          <Link
            to="/users"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2d2d2d]">Usuarios</h3>
              <span className="text-sm text-gray-500 group-hover:text-gray-700">
                Ir →
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              Crear, editar y administrar usuarios.
            </p>
            <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
              Abrir módulo
            </div>
          </Link>
        )}

        {/* Placeholder para próximos módulos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2d2d2d]">
            Resumen del día
          </h3>
          <p className="text-gray-600 mt-1">
            Próximamente: ventas del día, pedidos pendientes, etc.
          </p>
          <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>Ingresos de hoy: —</li>
            <li>Pedidos pendientes: —</li>
            <li>Pedidos entregados: —</li>
          </ul>
        </div>
      </section>

      {/* Info secundaria */}
      <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <p className="text-gray-700">
          Usa los atajos para navegar entre módulos. Esta pantalla será tu
          tablero principal con indicadores clave.
        </p>
      </section>
    </div>
  );
}

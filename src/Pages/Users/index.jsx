import { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function User() {

  const navigate = useNavigate();

  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const onNew = () => navigate("/app/usuarios/create");
  const onView = () => navigate("/");
  const onEdit = () => navigate("/");


  useEffect(() => {
    setLoading(true);
    invoke("list_users", {
      page, 
      perPage, 
      q: query || "", 
    })
      .then((res) => {
        setUsers(res || []);
      })
      .catch((err) => {
        console.error("Error cargando usuarios:", err);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [page, perPage, query]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = users || [];
    return q
      ? base.filter((u) =>
          [
            u.name,
            u.lastname,
            u.email,
            u.username,
            u.ci,
          ]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(q))
        )
      : base.slice();
  }, [users, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, totalPages);
  const pageData = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const onVer = (id) => console.log("Ver", id);
  const onEditar = (id) => console.log("Editar", id);
  const onEliminar = (id) => console.log("Eliminar", id);

  return (
    <div
      className="h-full w-full px-6 py-6"
      style={{
        ["--hb-primary"]: "#19C1BE",   // turquesa
        ["--hb-secondary"]: "#F27AB0", // rosa
        ["--hb-success"]: "#71C562",   // verde
        ["--hb-info"]: "#1C7F95",      // teal oscuro
        ["--hb-accent"]: "#A64AC9",    // morado
        ["--hb-warn"]: "#FF6F61",      // coral
      }}
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--hb-info)" }}>
          Gestión de Usuarios
        </h1>

        <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
          <div className="relative w-full max-w-xs">
            <input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Buscar por nombre, email, usuario…"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-[var(--hb-primary)] focus:outline-none focus:ring-4"
              style={{ boxShadow: "0 0 0 0 rgba(0,0,0,0)", outlineColor: "var(--hb-primary)" }}
            />
            <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          <select
            value={perPage}
            onChange={(e) => {
              setPage(1);
              setPerPage(Number(e.target.value));
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--hb-primary)] focus:outline-none focus:ring-1"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F27AB0] hover:bg-[#cf4784] px-4 py-2.5 text-sm font-semibold text-white shadow"
            onClick={onNew}
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold">Apellido</th>
              <th className="px-4 py-3 text-left font-semibold">C.I.</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Celular</th>
              <th className="px-4 py-3 text-left font-semibold">Rol</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="text-3xl">🗂️</div>
                    <p className="text-sm text-gray-500">No hay usuarios para mostrar.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((u) => (
                <tr key={(u.id && (u.id.$oid || u.id)) || `${u.username || ""}-${u.ci || ""}`} className="hover:bg-gray-50">
                  {/* Usuario + Foto */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${u.name || ""} ${u.lastname || ""}`} src={u.photo} />
                      <div className="leading-tight">
                        <div className="font-semibold text-gray-900">{u.username || "—"}</div>
                        <div className="text-xs text-gray-500">{u.email || "—"}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.lastname}</td>
                  <td className="px-4 py-3">{u.ci}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${u.email}`} className="text-[var(--hb-info)] hover:underline">
                      {u.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">{u.celular}</td>
                  <td className="px-4 py-3">
                    <Badge color="accent">{String(u.rol)}</Badge>
                  </td>

                  {/* Estado Activo/Inactivo */}
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
                        <CheckCircleIcon className="h-4 w-4" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                        <XCircleIcon className="h-4 w-4" />
                        Inactivo
                      </span>
                    )}
                  </td>

                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <IconGhost title="Ver" onClick={() => onVer(u.id?.$oid || u.id)}>
                        <EyeIcon className="h-5 w-5" />
                      </IconGhost>
                      <IconGhost title="Editar" onClick={() => onEditar(u.id?.$oid || u.id)}>
                        <PencilSquareIcon className="h-5 w-5" />
                      </IconGhost>
                      <IconGhost title="Eliminar" onClick={() => onEliminar(u.id?.$oid || u.id)}>
                        <TrashIcon className="h-5 w-5" />
                      </IconGhost>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-600">
          Mostrando{" "}
          <span className="font-semibold">
            {total === 0 ? 0 : (pageSafe - 1) * perPage + 1}–{Math.min(pageSafe * perPage, total)}
          </span>{" "}
          de <span className="font-semibold">{total}</span> usuarios
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-700">
            Página <span className="font-semibold">{pageSafe}</span> de{" "}
            <span className="font-semibold">{totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Avatar({ src, name }) {
  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return src ? (
    <img
      src={src}
      alt={name}
      className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
      style={{ outline: "2px solid var(--hb-primary)" }}
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
  ) : (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: "var(--hb-primary)" }}
      title={name}
    >
      {initials || <UserCircleIcon className="h-7 w-7 text-white" />}
    </div>
  );
}

function IconGhost({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2"
      style={{ focusRingColor: "var(--hb-primary)" }}
    >
      {children}
    </button>
  );
}

function Badge({ children, color = "secondary" }) {
  const map = {
    primary: "var(--hb-primary)",
    secondary: "var(--hb-secondary)",
    success: "var(--hb-success)",
    accent: "var(--hb-accent)",
    warn: "var(--hb-warn)",
  };
  const bg = hexToRgba(map[color] || map.secondary, 0.14);
  const bd = hexToRgba(map[color] || map.secondary, 0.35);
  const fg = map[color] || map.secondary;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
      style={{ backgroundColor: bg, color: fg, borderColor: bd }}
    >
      {children}
    </span>
  );
}

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

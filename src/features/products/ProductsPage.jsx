import React, { useEffect, useMemo, useState } from "react";
import { loadSession, isAdmin } from "../../store/session";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../../api/products";
import ProductToolbar from "./ProductToolbar";
import ProductFormCreate from "./ProductFormCreate";
import ProductFormEdit from "./ProductFormEdit";
import ProductGrid from "./ProductGrid";
import { toast } from "sonner";
import { PlusIcon } from "@heroicons/react/24/outline";

const CATEGORIES = [
  { key: "ALL", label: "Todos" },
  { key: "COMIDA", label: "Comida" },
  { key: "BEBIDA", label: "Bebida" },
  { key: "EXTRAS", label: "Extras" },
];

export default function ProductsPage() {
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState("ALL"); // 👈 categoría activa

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const tenantId = "ELTITI1";
  const branchId = "SUCURSAL1";
  const admin = isAdmin(session);

  useEffect(() => { fetchData(); }, [page, pageSize, searchQuery]);

  async function fetchData() {
    setLoading(true); setError("");
    try {
      const res = await listProducts({
        sessionId: session.session_id,
        tenantId,
        branchId,
        search: searchQuery,
        page,
        pageSize
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (err) {
      if (err?.message?.includes("Sesión inválida") || String(err)?.includes("Sesión inválida")) {
        localStorage.removeItem("app_session");
        window.location.href = "/login";
        return;
      }
      setError(err?.message || "Error");
    } finally { setLoading(false); }
  }

  function onEdit(p) { setSelected(p); setOpenEdit(true); }

  function onDelete(p) {
    if (window.confirm(`¿Eliminar el producto "${p.name}"?`)) {
      deleteProduct(session.session_id, p.id)
        .then(() => {
          fetchData();
          toast.success("Producto eliminado");
        })
        .catch(err => toast.error(err?.message || String(err)));
    }
  }

  const filteredRows = useMemo(() => {
    if (activeCat === "ALL") return rows;
    return rows.filter(p => p.category === activeCat);
  }, [rows, activeCat]);

  const filteredTotal = filteredRows.length;

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: rows.length, COMIDA: 0, BEBIDA: 0, EXTRAS: 0 };
    for (const p of rows) {
      if (p.category && counts[p.category] !== undefined) counts[p.category] += 1;
    }
    return counts;
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Productos</h1>
        {admin && (
          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-[#3A7D44] text-white px-3 py-2 hover:bg-[#2F6236] transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Nuevo
          </button>
        )}
      </div>

      <ProductToolbar
        search={search}
        setSearch={setSearch}
        onSearch={() => { setPage(1); setSearchQuery(search); }}
      />

      <div className="bg-white rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(({ key, label }) => {
            const isActive = activeCat === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveCat(key); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm border transition
                  ${isActive
                    ? "bg-[#5B2A86] text-white border-[#5B2A86]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                {label}{" "}
                <span className={isActive ? "text-white/80" : "text-gray-500"}>
                  ({key === "ALL" ? categoryCounts.ALL : categoryCounts[key]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Sin resultados</div>
        ) : (
          <ProductGrid
            items={filteredRows}
            onCardClick={onEdit}
            onDelete={onDelete}
            isAdmin={admin}
          />
        )}

        <div className="flex items-center justify-between p-3 border-t mt-3">
          <span className="text-sm text-gray-600">
            Total: <strong>{filteredTotal}</strong>
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

      <ProductFormCreate
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        defaults={{ tenant_id: tenantId, branch_id: branchId }}
        onSubmit={async (payload) => {
          try {
            await createProduct(session.session_id, payload);
            setOpenCreate(false);
            fetchData();
            toast.success("Producto creado correctamente");
          } catch (err) {
            toast.error(err?.message || String(err));
          }
        }}
      />

      {selected && (
        <ProductFormEdit
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelected(null); }}
          product={selected}
          onSubmit={async (changes) => {
            try {
              await updateProduct(session.session_id, selected.id, changes);
              setOpenEdit(false);
              setSelected(null);
              fetchData();
              toast.success("Producto actualizado");
            } catch (err) {
              toast.error(err?.message || String(err));
            }
          }}
        />
      )}
    </div>
  );
}

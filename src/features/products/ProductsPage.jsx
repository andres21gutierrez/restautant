import React, { useEffect, useMemo, useState } from "react";
import { loadSession, isAdmin } from "../../store/session";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../../api/products";
import ProductToolbar from "./ProductToolbar";
import ProductTable from "./ProductTable";
import ProductFormCreate from "./ProductFormCreate";
import ProductFormEdit from "./ProductFormEdit";
import { toast } from "sonner";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function ProductsPage() {
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const tenantId = "T1";
  const branchId = "B1";
  const admin = isAdmin(session);

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  async function fetchData() {
    setLoading(true); setError("");
    try {
      const res = await listProducts({ sessionId: session.session_id, tenantId, branchId, search, page, pageSize });
      setRows(res.data); setTotal(res.total);
    } catch (err) {
      if (err.message?.includes("Sesión inválida") || err?.includes("Sesión inválida")) {
        localStorage.removeItem("app_session");
        window.location.href = "/login";
        return;
      }
      setError(err.message || "Error");
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
        .catch(err => toast.error(err?.message || err));
    }
  }

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

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
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <ProductTable
            rows={rows}
            onEdit={onEdit}
            onDelete={onDelete}
            isAdmin={admin}
          />
        )}

        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-sm text-gray-600">
            Total: <strong>{total}</strong>
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
        onSubmit={async (payload)=>{
          try {
            await createProduct(session.session_id, payload);
            setOpenCreate(false);
            fetchData();
            toast.success("Producto creado correctamente");
          } catch (err) {
            toast.error(err?.message || err);
          }
        }}
      />

      {selected && (
        <ProductFormEdit
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelected(null); }}
          product={selected}
          onSubmit={async (changes)=>{
            try {
              await updateProduct(session.session_id, selected.id, changes);
              setOpenEdit(false);
              setSelected(null);
              fetchData();
              toast.success("Producto actualizado");
            } catch (err) {
              toast.error(err?.message || err);
            }
          }}
        />
      )}
    </div>
  );
}
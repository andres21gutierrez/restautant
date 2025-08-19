import React, { useEffect, useMemo, useState } from "react";
import { loadSession, isAdmin } from "../../store/session";
import { listUsers, toggleUserActive, updateUser, createUser } from "../../api/users";
import UserToolbar from "./UserToolbar";
import UserTable from "./UserTable";
import UserFormCreate from "./UserFormCreate";
import UserFormEdit from "./UserFormEdit";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function UsersPage() {
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const tenantId = "T1";
  const branchId = "B1";

  useEffect(() => { if (isAdmin(session)) fetchData(); }, [page, pageSize, search, onlyActive]);

  async function fetchData() {
    setLoading(true); setError("");
    try {
      const res = await listUsers({ sessionId: session.session_id, tenantId, branchId, search, page, pageSize, onlyActive });
      setRows(res.data); setTotal(res.total);
    } catch (e) {
      setError(e.message || "Error");
    } finally { setLoading(false); }
  }

  async function onToggle(u) { await toggleUserActive(session.session_id, u.id, !u.active); fetchData(); }
  async function onMakeAdmin(u) { await updateUser(session.session_id, u.id, { role: "ADMIN" }); fetchData(); }
  function onEdit(u) { setSelected(u); setOpenEdit(true); }

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2d2d2d]">Usuarios</h1>

        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3A7D44] text-white px-3 py-2 hover:bg-[#2F6236] transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo
        </button>
      </div>

      <UserToolbar
        search={search}
        setSearch={setSearch}
        onlyActive={onlyActive}
        setOnlyActive={setOnlyActive}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : (
          <UserTable rows={rows} onToggle={onToggle} onEdit={onEdit} onMakeAdmin={onMakeAdmin} />
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
              <ChevronLeftIcon className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-gray-700">Página {page} de {pages}</span>
            <button
              className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40 hover:bg-gray-50"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <UserFormCreate
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        defaults={{ tenant_id: tenantId, branch_id: branchId }}
        onSubmit={async (payload) => { await createUser(session.session_id, payload); setOpenCreate(false); fetchData(); }}
      />

      {selected && (
        <UserFormEdit
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelected(null); }}
          user={selected}
          onSubmit={async (changes) => { await updateUser(session.session_id, selected.id, changes); setOpenEdit(false); setSelected(null); fetchData(); }}
        />
      )}
    </div>
  );
}

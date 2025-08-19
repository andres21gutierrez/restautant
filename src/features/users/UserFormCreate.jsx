import React, { useEffect, useState } from "react";
import { validateNewUser } from "./validators";
import { ROLE_OPTIONS_UI, uiToBackendRole } from "./roles";

export default function UserFormCreate({ open, onClose, onSubmit, defaults }) {
  const [form, setForm] = useState({
    tenant_id: defaults?.tenant_id || "T1",
    branch_id: defaults?.branch_id || "B1",
    name: "",
    username: "",
    roleUi: "CAJERO",
    password: "",
    active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm((f) => ({
      ...f,
      tenant_id: defaults?.tenant_id || "T1",
      branch_id: defaults?.branch_id || "B1",
    }));
  }, [defaults]);

  if (!open) return null;
  function change(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      tenant_id: form.tenant_id,
      branch_id: form.branch_id,
      name: form.name,
      username: form.username,
      role: uiToBackendRole(form.roleUi), 
      password: form.password,
      active: form.active,
    };

    const errs = validateNewUser(payload);
    if (Object.keys(errs).length) return setErrors(errs);
    await onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-3">Nuevo usuario</h2>
        <div className="grid gap-3">
          <input className="border rounded p-2" placeholder="Nombre"
                 value={form.name} onChange={(e)=>change("name", e.target.value)} />
          {errors.name && <p className="text-red-600 text-xs">{errors.name}</p>}

          <input className="border rounded p-2" placeholder="Usuario"
                 value={form.username} onChange={(e)=>change("username", e.target.value)} />
          {errors.username && <p className="text-red-600 text-xs">{errors.username}</p>}

          <select className="border rounded p-2"
                  value={form.roleUi} onChange={(e)=>change("roleUi", e.target.value)}>
            {ROLE_OPTIONS_UI.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <input type="password" className="border rounded p-2" placeholder="Contraseña"
                 value={form.password} onChange={(e)=>change("password", e.target.value)} />
          {errors.password && <p className="text-red-600 text-xs">{errors.password}</p>}

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.active}
                   onChange={(e)=>change("active", e.target.checked)} />
            Activo
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="border rounded px-3 py-2">Cancelar</button>
          <button className="bg-[#3A7D44] hover:bg-[#2F6236] text-white rounded px-3 py-2">Crear</button>
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { validateNewUser } from "./validators";
import { ROLE_OPTIONS_UI, uiToBackendRole } from "./roles";
import { toast } from "sonner";

export default function UserFormCreate({ open, onClose, onSubmit, defaults }) {
  const [form, setForm] = useState({
    tenant_id: defaults?.tenant_id || "ELTITI1",
    branch_id: defaults?.branch_id || "SUCURSAL1",
    name: "",
    username: "",
    roleUi: "CAJERO", // UI label
    password: "",
    active: true,
  });
  const [errors, setErrors] = useState({});

  function change(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function resetForm() {
    setForm({
      tenant_id: defaults?.tenant_id || "ELTITI1",
      branch_id: defaults?.branch_id || "SUCURSAL1",
      name: "",
      username: "",
      roleUi: "CAJERO",
      password: "",
      active: true,
    });
    setErrors({});
  }

  // Al abrir el modal, limpia con los defaults actuales
  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults?.tenant_id, defaults?.branch_id]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      tenant_id: form.tenant_id,
      branch_id: form.branch_id,
      name: form.name.trim(),
      username: form.username.trim(),
      role: uiToBackendRole(form.roleUi), // "ADMIN"/"SELLER"
      password: form.password,
      active: form.active,
    };

    const errs = validateNewUser(payload);
    if (Object.keys(errs).length) return setErrors(errs);

    try {
      await onSubmit(payload);
      toast.success("Usuario creado");
      resetForm();
      onClose?.();
    } catch (err) {
      // el back ya manda mensajes claros (p.ej. "Ese usuario ya existe")
      toast.error(err?.message || String(err));
    }
  }

  function handleClose() {
    resetForm();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-3">Nuevo usuario</h2>

        <div className="grid gap-3">
          <input
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
            placeholder="Nombre"
            value={form.name}
            onChange={e=>change("name", e.target.value)}
          />
          {errors.name && <p className="text-red-600 text-xs">{errors.name}</p>}

          <input
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
            placeholder="Usuario"
            value={form.username}
            onChange={e=>change("username", e.target.value)}
          />
          {errors.username && <p className="text-red-600 text-xs">{errors.username}</p>}

          <select
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
            value={form.roleUi}
            onChange={e=>change("roleUi", e.target.value)}
          >
            {ROLE_OPTIONS_UI.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <input
            type="password"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
            placeholder="Contraseña"
            value={form.password}
            onChange={e=>change("password", e.target.value)}
          />
          {errors.password && <p className="text-red-600 text-xs">{errors.password}</p>}

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e=>change("active", e.target.checked)}
            />
            Activo
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={handleClose} className="border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button className="bg-[#3A7D44] hover:bg-[#2F6236] text-white rounded-lg px-4 py-2 font-semibold">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

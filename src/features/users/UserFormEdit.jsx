import React, { useEffect, useState } from "react";
import { validateUpdateUser } from "./validators";
import { ROLE_OPTIONS_UI, roleToUi, uiToBackendRole } from "./roles";
import { XMarkIcon, CheckIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function UserFormEdit({ open, onClose, user, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    roleUi: "CAJERO",
    active: true,
    new_password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        username: user.username,
        roleUi: roleToUi(user.role),
        active: user.active,
        new_password: "",
      });
    }
  }, [user]);

  if (!open || !user) return null;

  function change(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = {
      name: form.name,
      username: form.username,
      role: uiToBackendRole(form.roleUi),
      active: form.active,
      new_password: form.new_password || undefined,
    };
    const errs = validateUpdateUser(clean);
    if (Object.keys(errs).length) return setErrors(errs);
    await onSubmit(clean);
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">Editar usuario</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" title="Cerrar">
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-5 grid gap-4">
          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Nombre</label>
            <input className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
                   placeholder="Nombre" value={form.name} onChange={(e)=>change("name", e.target.value)} />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Usuario</label>
            <input className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
                   placeholder="Usuario" value={form.username} onChange={(e)=>change("username", e.target.value)} />
            {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Rol</label>
            <select className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
                    value={form.roleUi} onChange={(e)=>change("roleUi", e.target.value)}>
              {ROLE_OPTIONS_UI.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.role && <p className="text-red-600 text-xs mt-1">{errors.role}</p>}
          </div>

          <div>
            <span className="block text-[#333] text-base font-semibold mb-1">Estado</span>
            <button type="button" onClick={()=>change("active", !form.active)}
                    className={`relative inline-flex items-center h-9 w-16 rounded-full transition-colors ${form.active ? "bg-[#3A7D44]" : "bg-gray-300"}`}>
              <span className={`inline-block h-7 w-7 bg-white rounded-full shadow transform transition-transform ${form.active ? "translate-x-8" : "translate-x-1"}`} />
              <span className="sr-only">Toggle activo</span>
            </button>
            <span className="ml-3 text-sm text-gray-700 align-middle">{form.active ? "Activo" : "Inactivo"}</span>
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Nueva contraseña (opcional)</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"}
                     className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 pr-10 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
                     placeholder="••••••••" value={form.new_password}
                     onChange={(e)=>change("new_password", e.target.value)} />
              <button type="button" onClick={()=>setShowPwd(s=>!s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
                      title={showPwd ? "Ocultar" : "Mostrar"}>
                {showPwd ? <EyeSlashIcon className="w-5 h-5 text-gray-600" /> : <EyeIcon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
            {errors.new_password && <p className="text-red-600 text-xs mt-1">{errors.new_password}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
          <button className="inline-flex items-center gap-2 bg-[#3A7D44] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#2F6236] transition-colors">
            <CheckIcon className="w-5 h-5" />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

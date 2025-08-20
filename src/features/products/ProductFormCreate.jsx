import React, { useState } from "react";
import { validateNewProduct } from "./validators";

export default function ProductFormCreate({ open, onClose, onSubmit, defaults }) {
  const [form, setForm] = useState({
    tenant_id: defaults?.tenant_id || "T1",
    branch_id: defaults?.branch_id || "B1",
    name: "",
    photo_base64: "",
    price: "",
    description: "",
    category: "COMIDA", // <-- valor por defecto
  });
  const [errors, setErrors] = useState({});

  if (!open) return null;
  function change(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => change("photo_base64", reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      tenant_id: form.tenant_id,
      branch_id: form.branch_id,
      name: form.name,
      photo_base64: form.photo_base64,
      price: parseFloat(form.price),
      description: form.description,
      category: form.category, // <-- ahora sí pasa al payload
    };
    const errs = validateNewProduct(payload);
    if (Object.keys(errs).length) return setErrors(errs);
    await onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-3">Nuevo producto</h2>
        <div className="grid gap-3">
          <input className="border rounded p-2" placeholder="Nombre"
                 value={form.name} onChange={(e)=>change("name", e.target.value)} />
          {errors.name && <p className="text-red-600 text-xs">{errors.name}</p>}

          <input type="file" accept="image/*" className="border rounded p-2"
                 onChange={handlePhoto} />
          {errors.photo_base64 && <p className="text-red-600 text-xs">{errors.photo_base64}</p>}

          <input type="number" className="border rounded p-2" placeholder="Precio"
                 value={form.price} onChange={(e)=>change("price", e.target.value)} />
          {errors.price && <p className="text-red-600 text-xs">{errors.price}</p>}

          <textarea className="border rounded p-2" placeholder="Descripción"
                    value={form.description} onChange={(e)=>change("description", e.target.value)} />
          {errors.description && <p className="text-red-600 text-xs">{errors.description}</p>}

          <select
            className="border rounded p-2"
            value={form.category}
            onChange={e => change("category", e.target.value)}
          >
            <option value="COMIDA">Comida</option>
            <option value="BEBIDA">Bebida</option>
            <option value="EXTRAS">Extras</option>
          </select>
          {errors.category && <p className="text-red-600 text-xs">{errors.category}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="border rounded px-3 py-2">Cancelar</button>
          <button className="bg-[#3A7D44] hover:bg-[#2F6236] text-white rounded px-3 py-2">Crear</button>
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { validateUpdateProduct } from "./validators";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

export default function ProductFormEdit({ open, onClose, product, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    photo_base64: "",
    price: "",
    description: "",
    category: "COMIDA",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        photo_base64: product.photo_base64,
        price: product.price,
        description: product.description,
        category: product.category || "COMIDA", // <-- NUEVO
      });
    }
  }, [product]);

  if (!open || !product) return null;

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
    const clean = {
      name: form.name,
      photo_base64: form.photo_base64,
      price: parseFloat(form.price),
      description: form.description,
      category: form.category, // <-- NUEVO
    };
    const errs = validateUpdateProduct(clean);
    if (Object.keys(errs).length) return setErrors(errs);
    await onSubmit(clean);
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">Editar producto</h2>
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
            <label className="block text-[#333] text-base font-semibold mb-1">Foto</label>
            <input type="file" accept="image/*"
                   className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5"
                   onChange={handlePhoto} />
            {form.photo_base64 && (
              <img src={`data:image/*;base64,${form.photo_base64}`} alt="preview" className="mt-2 w-24 h-24 object-cover rounded" />
            )}
            {errors.photo_base64 && <p className="text-red-600 text-xs mt-1">{errors.photo_base64}</p>}
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Precio</label>
            <input type="number"
                   className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
                   placeholder="Precio" value={form.price} onChange={(e)=>change("price", e.target.value)} />
            {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Descripción</label>
            <textarea
              className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#3A7D44] focus:outline-none"
              placeholder="Descripción" value={form.description} onChange={(e)=>change("description", e.target.value)} />
            {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-[#333] text-base font-semibold mb-1">Categoría</label>
            <select
              className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5"
              value={form.category}
              onChange={e => change("category", e.target.value)}
            >
              <option value="COMIDA">Comida</option>
              <option value="BEBIDA">Bebida</option>
              <option value="EXTRAS">Extras</option>
            </select>
            {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
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
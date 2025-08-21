import React, { useEffect, useRef, useState } from "react";
import { validateUpdateProduct } from "./validators";
import { toast } from "sonner";
import {
  XMarkIcon,
  CheckIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

export default function ProductFormEdit({ open, onClose, product, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    photo_base64: "",
    cost: "",
    price: "",
    description: "",
    category: "COMIDA",
  });
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const fileRef = useRef(null);

  function change(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForm() {
    setForm({
      name: "",
      photo_base64: "",
      cost: "",
      price: "",
      description: "",
      category: "COMIDA",
    });
    setErrors({});
    setDragOver(false);
    setLoadingImage(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Cuando se abre con un producto, llenar; al cerrar, limpiar
  useEffect(() => {
    if (open && product) {
      setForm({
        name: product.name || "",
        photo_base64: product.photo_base64 || "",
        cost: product.cost ?? "",
        price: product.price ?? "",
        description: product.description || "",
        category: product.category || "COMIDA",
      });
      setErrors({});
      setDragOver(false);
      setLoadingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  if (!open || !product) return null;

  // ---- Imagen
  const MAX_MB = 3;
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  async function processImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({
        ...e,
        photo_base64: "Selecciona un archivo de imagen válido.",
      }));
      return;
    }
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_MB) {
      setErrors((e) => ({
        ...e,
        photo_base64: `La imagen supera ${MAX_MB}MB.`,
      }));
      return;
    }
    setLoadingImage(true);
    try {
      const dataUrl = await readFileAsBase64(file);
      const base64 = String(dataUrl).split(",")[1] || "";
      change("photo_base64", base64);
      setErrors((e) => ({ ...e, photo_base64: undefined }));
    } catch {
      setErrors((e) => ({ ...e, photo_base64: "No se pudo leer la imagen." }));
    } finally {
      setLoadingImage(false);
    }
  }
  function handlePhoto(e) {
    processImageFile(e.target.files?.[0]);
  }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processImageFile(e.dataTransfer.files?.[0]);
  }
  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave() {
    setDragOver(false);
  }
  function removeImage() {
    change("photo_base64", "");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = {
      name: form.name.trim(),
      photo_base64: form.photo_base64 || "",
      cost: parseFloat(form.cost),
      price: parseFloat(form.price),
      description: form.description.trim(),
      category: form.category,
    };

    const errs = validateUpdateProduct(clean);
    if (Object.keys(errs).length) return setErrors(errs);

    // Validación adicional: precio >= costo
    if (Number.isFinite(clean.cost) && Number.isFinite(clean.price) && clean.price < clean.cost) {
      toast.error("El precio de venta no puede ser menor al costo de elaboración. Verifica los valores.");
      return;
    }

    await onSubmit(clean);
    // si actualiza ok, limpiar y cerrar
    resetForm();
    onClose?.();
  }

  function handleClose() {
    resetForm();
    onClose?.();
  }

  const previewUrl = form.photo_base64 ? `data:image/*;base64,${form.photo_base64}` : "";

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <form className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl overflow-hidden" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">Editar producto</h2>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100" title="Cerrar">
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-5">
          {/* Columna izquierda: Imagen */}
          <div>
            <label className="block text-[#333] text-base font-semibold mb-2">Imagen</label>

            {!previewUrl ? (
              <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={[
                  "flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  dragOver ? "border-[#5B2A86] bg-purple-50/50" : "border-gray-300 hover:border-gray-400",
                ].join(" ")}
              >
                <PhotoIcon className="w-10 h-10 text-gray-400 mb-2" />
                <div className="text-sm text-gray-700">
                  Arrastra una imagen o <span className="text-[#5B2A86] font-semibold">haz clic para subir</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">PNG/JPG • máx {MAX_MB}MB</div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-[4/3] w-full bg-gray-100">
                  <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url(${previewUrl})` }} />
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-white"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Quitar
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
              </div>
            )}

            {loadingImage && <p className="text-xs text-gray-600 mt-2">Cargando imagen…</p>}
            {errors.photo_base64 && <p className="text-red-600 text-xs mt-1">{errors.photo_base64}</p>}

            <p className="text-[11px] text-gray-500 mt-2">Recomendado: 1:1 mínimo 800×800 px, fondo neutro.</p>
          </div>

          {/* Columna derecha: Campos */}
          <div className="grid gap-3">
            <div>
              <label className="block text-[#333] text-base font-semibold mb-1">Nombre</label>
              <input
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#333] text-base font-semibold mb-1">Costo de elaboración</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="Costo"
                  value={form.cost}
                  onChange={(e) => change("cost", e.target.value)}
                />
                {errors.cost && <p className="text-red-600 text-xs mt-1">{errors.cost}</p>}
              </div>
              <div>
                <label className="block text-[#333] text-base font-semibold mb-1">Precio de venta</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="Precio"
                  value={form.price}
                  onChange={(e) => change("price", e.target.value)}
                />
                {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[#333] text-base font-semibold mb-1">Descripción</label>
              <textarea
                rows={4}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="Descripción"
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-[#333] text-base font-semibold mb-1">Categoría</label>
              <select
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5"
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
              >
                <option value="COMIDA">Comida</option>
                <option value="BEBIDA">Bebida</option>
                <option value="EXTRAS">Extras</option>
              </select>
              {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            className="border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
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

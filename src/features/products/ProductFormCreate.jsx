import React, { useEffect, useRef, useState } from "react";
import { validateNewProduct } from "./validators";
import { toast } from "sonner";
import { PhotoIcon, ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function ProductFormCreate({ open, onClose, onSubmit, defaults }) {
  const [form, setForm] = useState({
    tenant_id: defaults?.tenant_id || "ELTITI1",
    branch_id: defaults?.branch_id || "SUCURSAL1",
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

  function change(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function resetForm() {
    setForm({
      tenant_id: defaults?.tenant_id || "ELTITI1",
      branch_id: defaults?.branch_id || "SUCURSAL1",
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

  // Al abrir el modal, limpia con los defaults actuales
  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    resetForm();
    onClose?.();
  }

  // Imagen
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
      setErrors((e)=>({ ...e, photo_base64: "Selecciona un archivo de imagen válido." }));
      return;
    }
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_MB) {
      setErrors((e)=>({ ...e, photo_base64: `La imagen supera ${MAX_MB}MB.` }));
      return;
    }
    setLoadingImage(true);
    try {
      const dataUrl = await readFileAsBase64(file);
      const base64 = String(dataUrl).split(",")[1] || "";
      change("photo_base64", base64);
      setErrors((e)=>({ ...e, photo_base64: undefined }));
    } catch {
      setErrors((e)=>({ ...e, photo_base64: "No se pudo leer la imagen." }));
    } finally {
      setLoadingImage(false);
    }
  }
  function handlePhoto(e) { processImageFile(e.target.files?.[0]); }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); processImageFile(e.dataTransfer.files?.[0]); }
  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function removeImage() { change("photo_base64", ""); if (fileRef.current) fileRef.current.value = ""; }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      tenant_id: form.tenant_id,
      branch_id: form.branch_id,
      name: form.name.trim(),
      photo_base64: form.photo_base64 || "",
      cost: parseFloat(form.cost),
      price: parseFloat(form.price),
      description: form.description.trim(),
      category: form.category,
    };
    const errs = validateNewProduct(payload);
    if (Object.keys(errs).length) return setErrors(errs);

    // Validación: precio >= costo
    if (payload.price < payload.cost) {
      toast.error("El precio de venta no puede ser menor al costo de elaboración. Verifica los valores.");
      return;
    }

    await onSubmit(payload);
    // Al crear con éxito: limpiar y cerrar
    resetForm();
    onClose?.();
  }

  if (!open) return null;

  const previewUrl = form.photo_base64 ? `data:image/*;base64,${form.photo_base64}` : "";

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-[#2d2d2d] mb-4">Nuevo producto</h2>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del producto</label>
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

            <p className="text-[11px] text-gray-500 mt-2">Recomendado: cuadrada (1:1) mínimo 800×800 px, fondo neutro.</p>
          </div>

          {/* Campos */}
          <div className="grid gap-3">
            <div>
              <input
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="Nombre del producto"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="Costo de elaboración"
                  value={form.cost}
                  onChange={(e) => change("cost", e.target.value)}
                />
                {errors.cost && <p className="text-red-600 text-xs mt-1">{errors.cost}</p>}
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                  placeholder="Precio de venta"
                  value={form.price}
                  onChange={(e) => change("price", e.target.value)}
                />
                {errors.price && <p className="text-red-600 text-xs mt-1">{errors.price}</p>}
              </div>
            </div>

            <div>
              <select
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
              >
                <option value="COMIDA">Comida</option>
                <option value="BEBIDA">Bebida</option>
                <option value="EXTRAS">Extras</option>
              </select>
              {errors.category && <p className="text-red-600 text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <textarea
                rows={4}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-base focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                placeholder="Descripción (opcional)"
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
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

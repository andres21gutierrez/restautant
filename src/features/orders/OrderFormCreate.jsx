import React, { useEffect, useMemo, useState } from "react";
import { listProducts } from "../../api/products";
import { createOrder } from "../../api/orders";
import { toast } from "sonner";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
  TruckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const DELIVERY_COMPANIES = [
  "Correcaminos", "Encargos", "Te lo llevo", "Rapibol", "Sonic",
  "Flash", "Coyotes", "Turbo", "Skiper", "Speed", "Puriskiry",
  "Motoboy", "Telo llevo Falso", "Taz delivery"
];

const CATEGORIES = [
  { key: "ALL", label: "Todos" },
  { key: "COMIDA", label: "Comida" },
  { key: "BEBIDA", label: "Bebida" },
  { key: "EXTRAS", label: "Extras" },
];

export default function OrderFormCreate({
  open,
  onClose,
  tenantId,
  branchId,
  sessionId,
  onSubmitSuccess,
}) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("ALL");

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashAmount, setCashAmount] = useState("");
  const [change, setChange] = useState(0);

  const [delivery, setDelivery] = useState({ use: false, company: "", address: "", phone: "" });
  const [comments, setComments] = useState("");

  // ------- Helpers
  function resetAll() {
    setProducts([]);
    setSearch("");
    setActiveCat("ALL");
    setSelectedProducts([]);
    setPaymentMethod("CASH");
    setCashAmount("");
    setChange(0);
    setDelivery({ use: false, company: "", address: "", phone: "" });
    setComments("");
  }

  function handleClose() {
    resetAll();
    onClose?.();
  }

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const response = await listProducts({
            sessionId,
            tenantId,
            branchId,
            search: "",
            page: 1,
            pageSize: 300, // cargar de una
          });
          setProducts(response.data || []);
          setSearch("");
          setActiveCat("ALL");
          setSelectedProducts([]);
          setCashAmount("");
          setChange(0);
        } catch {
          toast.error("Error al cargar productos");
        }
      })();
    } else {
      resetAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function calculateTotal() {
    return selectedProducts.reduce((t, it) => t + Number(it.price) * Number(it.quantity), 0);
  }

  useEffect(() => {
    if (paymentMethod === "CASH" && cashAmount) {
      const amount = parseFloat(cashAmount) || 0;
      const total = calculateTotal();
      setChange(amount > total ? amount - total : 0);
    } else {
      setChange(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashAmount, selectedProducts, paymentMethod]);

  // ------- Product actions
  function addProduct(product) {
    setSelectedProducts(prev => {
      const found = prev.find(p => p.product_id === product.id);
      if (found) {
        return prev.map(p =>
          p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  function removeProduct(productId) {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) return removeProduct(productId);
    setSelectedProducts(prev =>
      prev.map(p => (p.product_id === productId ? { ...p, quantity } : p))
    );
  }

  // ------- Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const catOk = activeCat === "ALL" || p.category === activeCat;
      const nameOk = !q || String(p.name).toLowerCase().includes(q);
      return catOk && nameOk;
    });
  }, [products, search, activeCat]);

  const total = calculateTotal();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (selectedProducts.length === 0) {
            toast.error("Añade al menos un producto");
            return;
          }

          const total = calculateTotal();

          if (paymentMethod === "CASH") {
            const amount = parseFloat(cashAmount) || 0;
            if (amount < total) {
              toast.error("El monto en efectivo no puede ser menor al total");
              return;
            }
          }

          try {
            const orderItems = selectedProducts.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
            }));

            const orderData = {
              tenant_id: tenantId,
              branch_id: branchId,
              items: orderItems,
              payment_method: paymentMethod,
              cash_amount: paymentMethod === "CASH" ? parseFloat(cashAmount) : null,
              delivery: delivery.use
                ? {
                    company: delivery.company,
                    address: delivery.address,
                    phone: delivery.phone,
                  }
                : null,
              comments: comments || null,
            };

            await createOrder(sessionId, orderData);
            toast.success("Pedido creado correctamente");
            onSubmitSuccess?.();
            handleClose();
          } catch (error) {
            toast.error(error?.message || "Error al crear pedido");
          }
        }}
        className="bg-white rounded-2xl shadow p-5 w-full max-w-6xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">Nuevo Pedido</h2>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            <XMarkIcon className="w-5 h-5" />
            Cerrar
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Izquierda: catálogo */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            {/* Search + Tabs */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#5B2A86]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map(({ key, label }) => {
                  const count = key === "ALL"
                    ? products.length
                    : products.filter(p => p.category === key).length;

                  const isActive = activeCat === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveCat(key)}
                      className={`px-3 cursor-pointer py-1.5 rounded-full text-sm border transition
                        ${isActive ? "bg-[#5B2A86] text-white border-[#5B2A86]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
                      `}
                    >
                      {label} <span className={`ml-1 ${isActive ? "text-white/80" : "text-gray-500"}`}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid productos */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(product => {
                const img = product.photo_base64 ? `data:image/*;base64,${product.photo_base64}` : null;
                return (
                  <div
                    key={product.id}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow transition"
                  >
                    <div className="aspect-[4/3] bg-gray-100">
                      {img ? (
                        <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url(${img})` }} />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-gray-400 text-sm">Sin foto</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[#2d2d2d] line-clamp-1">{product.name}</div>
                        <div className="text-sm font-medium text-[#3A7D44]">Bs {Number(product.price).toFixed(2)}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description || "—"}</div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => addProduct(product)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500">
                  No hay productos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>

          {/* Derecha: selección / pago */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <h3 className="font-medium text-[#2d2d2d] mb-2">Productos Seleccionados</h3>

            <div className="rounded-lg border border-gray-200 max-h-72 overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <div className="p-4 text-gray-500">No hay productos seleccionados</div>
              ) : (
                selectedProducts.map(item => (
                  <div
                    key={item.product_id}
                    className="px-3 py-2 border-b flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#2d2d2d] truncate">{item.name}</div>
                      <div className="text-xs text-gray-500">Bs {Number(item.price).toFixed(2)} c/u</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="border rounded-lg p-1 hover:bg-gray-50"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        title="Quitar uno"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="border rounded-lg p-1 hover:bg-gray-50"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        title="Agregar uno"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="border border-red-200 text-red-600 rounded-lg p-1 hover:bg-red-50 ml-1"
                        onClick={() => removeProduct(item.product_id)}
                        title="Eliminar"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 text-right text-base">
              <span className="text-gray-600 mr-2">Total:</span>
              <span className="font-semibold">Bs {total.toFixed(2)}</span>
            </div>

            {/* Pago */}
            <div className="mt-4">
              <h3 className="font-medium text-[#2d2d2d] mb-2">Método de Pago</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex cursor-pointer items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                    paymentMethod === "CASH"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <BanknotesIcon className="w-5 h-5" />
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD")}
                  className={`flex cursor-pointer items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                    paymentMethod === "CARD"
                      ? "bg-sky-50 border-sky-300 text-sky-800"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <CreditCardIcon className="w-5 h-5" />
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QR")}
                  className={`flex cursor-pointer items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                    paymentMethod === "QR"
                      ? "bg-purple-50 border-purple-300 text-purple-800"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <QrCodeIcon className="w-5 h-5" />
                  QR
                </button>
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monto entregado</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cambio</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 bg-gray-100"
                    value={`Bs ${change.toFixed(2)}`}
                    readOnly
                  />
                </div>
              </div>
            )}

            {/* Delivery */}
            <div className="mt-5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={delivery.use}
                  onChange={(e) => setDelivery({ ...delivery, use: e.target.checked })}
                />
                <span className="text-sm text-gray-700 inline-flex items-center gap-1">
                  <TruckIcon className="w-4 h-4" />
                  Es delivery
                </span>
              </label>

              {delivery.use && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Empresa</label>
                    <select
                      className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                      value={delivery.company}
                      onChange={(e) => setDelivery({ ...delivery, company: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {DELIVERY_COMPANIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Teléfono</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                      value={delivery.phone}
                      onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Dirección</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                      value={delivery.address}
                      onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Comentarios */}
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">Comentarios</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-[#5B2A86] focus:outline-none"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Observaciones para cocina / delivery…"
              />
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={handleClose}
                className="border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#3A7D44] hover:bg-[#2F6236] text-white rounded-lg px-4 py-2 font-semibold"
              >
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { listProducts } from "../../api/products";
import { createOrder } from "../../api/orders";
import { toast } from "sonner";

const DELIVERY_COMPANIES = [
  "Correcaminos", "Encargos", "Te lo llevo", "Rapibol", "Sonic", 
  "Flash", "Coyotes", "Turbo", "Skiper", "Speed", "Puriskiry", 
  "Motoboy", "Telo llevo Falso", "Taz delivery"
];

export default function OrderFormCreate({ open, onClose, tenantId, branchId, sessionId, onSubmitSuccess }) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [delivery, setDelivery] = useState({ use: false, company: "", address: "", phone: "" });
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  async function loadProducts() {
    try {
      const response = await listProducts({ sessionId, tenantId, branchId, search: "", page: 1, pageSize: 100 });
      setProducts(response.data);
    } catch (error) {
      toast.error("Error al cargar productos");
    }
  }

  function addProduct(product) {
    const existing = selectedProducts.find(p => p.product_id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p =>
        p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
  }

  function removeProduct(productId) {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, quantity } : p
    ));
  }

  function calculateTotal() {
    return selectedProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const orderItems = selectedProducts.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const orderData = {
        tenant_id: tenantId,
        branch_id: branchId,
        items: orderItems,
        payment_method: paymentMethod,
        delivery: delivery.use ? {
          company: delivery.company,
          address: delivery.address,
          phone: delivery.phone
        } : null,
        comments: comments || null
      };

      await createOrder(sessionId, orderData);
      toast.success("Pedido creado correctamente");
      onSubmitSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || "Error al crear pedido");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 w-full max-w-4xl max-h-screen overflow-y-auto">
        <h2 className="text-lg font-semibold mb-3">Nuevo Pedido</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Productos Disponibles</h3>
            <div className="border rounded-lg p-2 h-96 overflow-y-auto">
              {products.map(product => (
                <div key={product.id} className="p-2 border-b flex justify-between items-center">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm">${product.price.toFixed(2)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Productos Seleccionados</h3>
            <div className="border rounded-lg p-2 h-96 overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <div className="text-gray-500">No hay productos seleccionados</div>
              ) : (
                selectedProducts.map(item => (
                  <div key={item.product_id} className="p-2 border-b flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm">${item.price.toFixed(2)} c/u</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="bg-gray-200 px-2 py-1 rounded"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="bg-gray-200 px-2 py-1 rounded"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(item.product_id)}
                        className="bg-red-500 text-white px-2 py-1 rounded ml-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 font-bold">Total: ${calculateTotal().toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Método de Pago</h3>
          <select
            className="border rounded p-2 w-full"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="QR">QR</option>
          </select>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={delivery.use}
              onChange={(e) => setDelivery({ ...delivery, use: e.target.checked })}
            />
            Es delivery
          </label>
          {delivery.use && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label>Empresa de delivery</label>
                <select
                  className="border rounded p-2 w-full"
                  value={delivery.company}
                  onChange={(e) => setDelivery({ ...delivery, company: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {DELIVERY_COMPANIES.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Dirección</label>
                <input
                  type="text"
                  className="border rounded p-2 w-full"
                  value={delivery.address}
                  onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                />
              </div>
              <div>
                <label>Teléfono</label>
                <input
                  type="text"
                  className="border rounded p-2 w-full"
                  value={delivery.phone}
                  onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label>Comentarios</label>
          <textarea
            className="border rounded p-2 w-full"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="border rounded px-3 py-2">Cancelar</button>
          <button type="submit" className="bg-[#3A7D44] text-white rounded px-3 py-2">Crear Pedido</button>
        </div>
      </form>
    </div>
  );
}
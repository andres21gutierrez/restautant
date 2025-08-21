import React from "react";

export default function OrderToolbar({ statusFilter, setStatusFilter }) {
  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "PENDING", label: "Pendiente" },
    { value: "IN_PROGRESS", label: "En progreso" },
    { value: "READY", label: "Listo" },
    { value: "DELIVERED", label: "Entregado" },
    { value: "CANCELLED", label: "Cancelado" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3">
      <div>
        <label className="block text-[#333] text-sm font-semibold mb-1">Filtrar por estado</label>
        <select
          className="pl-3 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3A7D44] focus:outline-none text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
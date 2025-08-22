// src/components/PrinterSelector.jsx
import React from "react";
import { usePrinterSelection } from "../hooks/usePrinterSelection";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function PrinterPicker({ className = "" }) {
  const { printers, selected, loading, refreshPrinters, choosePrinter } = usePrinterSelection();

  return (
    <div className="flex flex-col">
    <label className="block text-sm text-gray-600 mb-1">Impresora</label>
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        className="border rounded-lg px-3 py-2 min-w-[280px]"
        value={selected ? JSON.stringify(selected) : ""}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;
          try {
            choosePrinter(JSON.parse(val));
          } catch {
            // ignore
          }
        }}
      >
        <option value="">{loading ? "Cargando impresoras…" : "Selecciona una impresora…"}</option>
        {printers.map((p, idx) => (
          <option key={`${p.name}-${p.port || idx}`} value={JSON.stringify(p)}>
            {p.name}{p.port ? ` — ${p.port}` : ""}
          </option>
        ))}
      </select>

      <button
        onClick={refreshPrinters}
        title="Refrescar impresoras"
        className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        Refrescar
      </button>
    </div>
    </div>
  );
}

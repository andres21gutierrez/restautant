// src/hooks/usePrinterSelection.js
import { useEffect, useState } from "react";
import { listPrinters } from "@/api/printers";

const LS_KEY = "selected_printer"; // guarda { name, port? }

export function usePrinterSelection() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  async function refreshPrinters() {
    setLoading(true);
    try {
      const res = await listPrinters();
      // Normalizamos por si el back devuelve estructuras distintas
      const norm = Array.isArray(res)
        ? res.map((p, i) => ({
            name: p.name || p.device_name || p.friendly_name || `Impresora ${i + 1}`,
            port: p.port || p.device_port || p.path || null,
          }))
        : [];
      setPrinters(norm);

      // Si la impresora guardada ya no está, la limpiamos:
      if (selected) {
        const stillExists = norm.some(
          (p) => (selected.name && p.name === selected.name) || (selected.port && p.port === selected.port)
        );
        if (!stillExists) {
          setSelected(null);
          localStorage.removeItem(LS_KEY);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPrinters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choosePrinter(p) {
    setSelected(p);
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  }

  return { printers, selected, loading, refreshPrinters, choosePrinter };
}

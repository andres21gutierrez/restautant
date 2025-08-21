import React from "react";
import { PencilSquareIcon, TrashIcon, TagIcon } from "@heroicons/react/24/outline";

function formatMoney(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "Bs 0.00";
  return `Bs ${v.toFixed(2)}`;
}

function CategoryBadge({ cat }) {
  const map = {
    COMIDA: "bg-purple-100 text-purple-800",
    BEBIDA: "bg-sky-100 text-sky-800",
    EXTRAS: "bg-amber-100 text-amber-800",
  };
  const cls = map[cat] || "bg-gray-100 text-gray-800";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${cls}`}>{cat}</span>;
}

export default function ProductGrid({ items, onCardClick, onDelete, isAdmin }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => {
        const margin = Number(p.price) - Number(p.cost);
        const marginPct =
          Number(p.price) > 0 ? Math.round((margin / Number(p.price)) * 100) : 0;
        const hasPhoto = Boolean(p.photo_base64);
        const photoUrl = hasPhoto ? `data:image/*;base64,${p.photo_base64}` : null;

        return (
          <div
            key={p.id}
            className="group relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Botón eliminar (admin) */}
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(p); }}
                title="Eliminar"
                className="absolute cursor-pointer right-2 top-2 z-10 bg-white/90 hover:bg-red-50 border border-red-200 text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}

            <div
              className="aspect-[4/3] bg-gray-100"
            >
              {photoUrl ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${photoUrl})` }}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                  Sin foto
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <h3
                  onClick={() => onCardClick?.(p)}
                  className="cursor-pointer font-semibold text-[#2d2d2d] line-clamp-1 group-hover:underline"
                  title={p.name}
                >
                  {p.name}
                </h3>
                <CategoryBadge cat={p.category} />
              </div>

              <p className="text-sm text-gray-600 mt-1 line-clamp-2" title={p.description}>
                {p.description || "—"}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                <div className="text-sm">
                  <div className="text-gray-500">C. Elaboración</div>
                  <div className="font-medium">{formatMoney(p.cost)}</div>
                </div>
                <div className="text-sm text-right">
                  <div className="text-gray-500">Precio de venta</div>
                  <div className="font-semibold text-[#3A7D44]">{formatMoney(p.price)}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="inline-flex items-center gap-1 text-gray-600">
                  <TagIcon className="w-4 h-4" />
                  Margen de ganancia
                </div>
                <div className={`font-semibold ${margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {margin >= 0 ? `+${marginPct}%` : `${marginPct}%`}
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => onCardClick?.(p)}
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  title="Editar"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Editar
                </button>

                {/* Eliminar duplicado para móvil (si quieres solo uno, quita este y deja el flotante) */}
                {isAdmin && (
                  <button
                    onClick={() => onDelete?.(p)}
                    className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 sm:hidden"
                    title="Eliminar"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

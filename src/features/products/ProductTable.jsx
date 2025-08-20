import React from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

export default function ProductTable({ rows, onEdit, isAdmin }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 px-3 font-medium">Foto</th>
            <th className="py-2 px-3 font-medium">Nombre</th>
            <th className="py-2 px-3 font-medium">Precio</th>
            <th className="py-2 px-3 font-medium">Descripción</th>
            {isAdmin && <th className="py-2 px-3 font-medium text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50/60">
              <td className="py-2 px-3">
                {p.photo_base64 ? (
                  <img src={`data:image/*;base64,${p.photo_base64}`} alt={p.name} className="w-16 h-16 object-cover rounded" />
                ) : (
                  <span className="text-gray-400">Sin foto</span>
                )}
              </td>
              <td className="py-2 px-3">{p.name}</td>
              <td className="py-2 px-3">${p.price.toFixed(2)}</td>
              <td className="py-2 px-3">{p.description}</td>
              {isAdmin && (
                <td className="py-2 px-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => onEdit(p)}
                      title="Editar"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Editar
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-gray-500">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
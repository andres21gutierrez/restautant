import React from "react";
import {
  PencilSquareIcon,
  PowerIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { roleToUi } from "./roles";

export default function UserTable({ rows, onToggle, onEdit, onMakeAdmin }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 px-3 font-medium">Nombre</th>
            <th className="py-2 px-3 font-medium">Usuario</th>
            <th className="py-2 px-3 font-medium">Rol</th>
            <th className="py-2 px-3 font-medium">Activo</th>
            <th className="py-2 px-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50/60">
              <td className="py-2 px-3">{u.name}</td>
              <td className="py-2 px-3">{u.username}</td>
              <td className="py-2 px-3">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium
                        ${u.role === "ADMIN"
                        ? "bg-emerald-100 text-emerald-800"
                        : u.role === "SELLER"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                        }`}
                    >
                    {roleToUi(u.role)}
                </span>

              </td>
              <td className="py-2 px-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                  {u.active ? "Sí" : "No"}
                </span>
              </td>
              <td className="py-2 px-3">
                <div className="flex gap-2 justify-end">
                  <button
                    className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
                    onClick={() => onEdit(u)}
                    title="Editar"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                    Editar
                  </button>

                  <button
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-white ${u.active ? "bg-red-600 hover:bg-red-700" : "bg-[#3A7D44] hover:bg-[#2F6236]"}`}
                    onClick={() => onToggle(u)}
                    title={u.active ? "Desactivar" : "Activar"}
                  >
                    <PowerIcon className="w-4 h-4" />
                    {u.active ? "Desactivar" : "Activar"}
                  </button>

                  {u.role !== "ADMIN" && (
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 border rounded-lg px-2.5 py-1.5 text-gray-700 hover:bg-gray-50"
                      onClick={() => onMakeAdmin(u)}
                      title="Convertir en ADMIN"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      Hacer ADMIN
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-gray-500">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

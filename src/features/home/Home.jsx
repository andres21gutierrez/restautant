import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="space-y-6">
      {/* Atajos rápidos */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Pedidos */}
        <Link
          to="/orders"
          className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Pedidos</h3>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              Ir →
            </span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
            Abrir módulo
          </div>
        </Link>

        {/* Productos */}
        <Link
          to="/products"
          className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Productos</h3>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              Ir →
            </span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
            Abrir módulo
          </div>
        </Link>

        {/* Usuarios */}
        <Link
          to="/users"
          className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Usuarios</h3>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              Ir →
            </span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-lg bg-[#5B2A86] text-white px-3 py-1.5 text-sm group-hover:bg-[#4b2270]">
            Abrir módulo
          </div>
        </Link>
      </section>
    </div>
  );
}

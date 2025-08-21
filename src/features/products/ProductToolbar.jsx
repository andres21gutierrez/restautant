import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function ProductToolbar({ search, setSearch }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3">
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#3A7D44] focus:outline-none min-w-[260px] text-sm"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}

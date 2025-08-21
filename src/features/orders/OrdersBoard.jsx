import React from "react";
import OrderCard from "./OrderCard";
import { ChevronRightIcon , ChevronLeftIcon } from "@heroicons/react/24/outline";

function BoardColumn({ title, orders, total, page, onPageChange, disablePaging, children, perPage }) {
  const maxPage = Math.ceil(total / perPage) || 1;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-[#2d2d2d]">{title}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
          {total}
        </span>
      </div>
      <div className="space-y-3 flex-1">{children}</div>

      <div className="flex justify-between items-center mt-3 text-sm">
        <button
          disabled={disablePaging || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`px-2 py-1 rounded ${
            disablePaging || page <= 1 ? "text-gray-400" : "text-purple-400 hover:text-purple-800 cursor-pointer"
          }`}
        >
          <ChevronLeftIcon className="inline w-4 h-4" /> Anterior 
        </button>
        <span>
          Página {page} de {maxPage}
        </span>
        <button
          disabled={disablePaging || page >= maxPage}
          onClick={() => onPageChange(page + 1)}
          className={`px-2 py-1 rounded ${
            disablePaging || page >= maxPage ? "text-gray-400" : "text-purple-600 hover:text-purple-800 cursor-pointer"
          }`}
        >
          Siguiente <ChevronRightIcon className="inline w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function OrdersBoard({
  pending,
  delivered,
  canceled,
  perPage,
  onPageChange,
  onDispatch,
  onCancel,
  onPrint,
  searchingByNumber,
  onOpenDetails
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <BoardColumn
        title="Pendientes"
        orders={pending.data}
        total={pending.total}
        page={pending.page}
        onPageChange={onPageChange.pending}
        perPage={perPage}
        disablePaging={searchingByNumber}
      >
        {pending.data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay pedidos pendientes</div>
        ) : (
          pending.data.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onDispatch={() => onDispatch?.(o.id)}
              onCancel={() => onCancel?.(o.id)}
              onPrint={onPrint}
              showActions
              onClick={() => onOpenDetails?.(o.id)}
            />
          ))
        )}
      </BoardColumn>

      <BoardColumn
        title="Despachados"
        orders={delivered.data}
        total={delivered.total}
        page={delivered.page}
        onPageChange={onPageChange.delivered}
        perPage={perPage}
        disablePaging={searchingByNumber}
      >
        {delivered.data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay pedidos despachados</div>
        ) : (
          delivered.data.map((o) => (
            <OrderCard key={o.id} order={o} onPrint={onPrint} onClick={() => onOpenDetails?.(o.id)} showActions={false} />
          ))
        )}
      </BoardColumn>

      <BoardColumn
        title="Cancelados"
        orders={canceled.data}
        total={canceled.total}
        page={canceled.page}
        onPageChange={onPageChange.canceled}
        perPage={perPage}
        disablePaging={searchingByNumber}
      >
        {canceled.data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay pedidos cancelados</div>
        ) : (
          canceled.data.map((o) => (
            <OrderCard key={o.id} order={o} onPrint={onPrint} showActions={false} onClick={() => onOpenDetails?.(o.id)}  canceled/>
          ))
        )}
      </BoardColumn>
    </div>
  );
}

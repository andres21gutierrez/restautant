export default function ConfirmDialog({
  open,
  title = "Confirmación",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-[100]">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            className="border rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-white disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#3A7D44] hover:bg-[#2F6236]"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

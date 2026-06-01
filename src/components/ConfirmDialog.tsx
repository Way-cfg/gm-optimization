interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-sm mb-2">{title}</h3>
        <p className="text-xs text-gray-400 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 rounded transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

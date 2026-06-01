import { motion } from "framer-motion";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0A0D14]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl p-5 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-sm mb-2 text-white/80">{title}</h3>
        <p className="text-xs text-white/30 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-all duration-200 text-white/50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-xs bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-all duration-200 text-white/80">
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmClass = 'bg-catedral text-perla',
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-catedral/50" onClick={onCancel} />
      <div className="relative bg-perla rounded-3xl-3 p-6 max-w-sm w-full shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-arcilla flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-ladrillo" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-tierra">{title}</h3>
            <p className="text-xs text-arena mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-ladrillo bg-yeso rounded-3xl-3 hover:bg-arcilla disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-sm font-semibold rounded-3xl-3 disabled:opacity-50 transition-all ${confirmClass}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import { Check, X } from 'lucide-react';
import { getImageUrl } from '../lib/api';
import { CATEGORIA_NAMES } from '../lib/categories';
import StatusBadge from './StatusBadge';

interface PendingReportCardProps {
  id: number;
  categoria_id: number;
  url_imagen: string;
  device_id: string;
  creado_en: string;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  loading?: boolean;
}

export default function PendingReportCard({
  id,
  categoria_id,
  url_imagen,
  device_id,
  creado_en,
  selected,
  onSelect,
  onAccept,
  onReject,
  loading,
}: PendingReportCardProps) {
  const fecha = new Date(creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-perla rounded-3xl-2 p-3 flex items-center gap-3">
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(id)}
          className="w-4 h-4 rounded accent-catedral shrink-0"
        />
      )}
      <img
        src={getImageUrl(url_imagen)}
        alt=""
        className="w-14 h-14 object-cover rounded-2xl shrink-0 bg-yeso"
      />
      <div className="min-w-0 flex-1">
        <StatusBadge estado="Reportado" />
        <p className="text-xs text-tierra font-medium truncate mt-1">
          {CATEGORIA_NAMES[categoria_id] || 'Otro'}
        </p>
        <p className="text-[10px] text-arena mt-0.5">
          ID #{id} · {device_id.slice(0, 8)} · {fecha}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onAccept && (
          <button
            onClick={() => onAccept(id)}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center bg-sol-camba text-perla rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all"
            title="Aceptar"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        {onReject && (
          <button
            onClick={() => onReject(id)}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center bg-catedral text-arena rounded-2xl hover:brightness-125 disabled:opacity-50 transition-all"
            title="Rechazar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

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
  onSelect: (id: number) => void;
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
  loading,
}: PendingReportCardProps) {
  const fecha = new Date(creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid={`report-card-${id}`}
      className={`bg-perla rounded-3xl-2 p-3 flex items-center gap-3 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-caoba ring-offset-1' : 'hover:ring-1 hover:ring-arcilla'
      } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input
        type="checkbox"
        checked={!!selected}
        onChange={() => onSelect(id)}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded accent-catedral shrink-0"
        aria-label={`Seleccionar reporte #${id}`}
      />
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
          #{id} · {device_id.slice(0, 8)} · {fecha}
        </p>
      </div>
    </div>
  );
}

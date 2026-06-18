import { Link } from 'react-router-dom';
import { CATEGORIA_NAMES } from '../lib/categories';
import StatusBadge from './StatusBadge';

interface ReporteCardProps {
  id: number;
  categoria_id: number;
  estado: string;
  url_imagen: string;
  creado_en: string;
}

export default function ReporteCard({
  id,
  categoria_id,
  estado,
  url_imagen,
  creado_en,
}: ReporteCardProps) {
  const fecha = new Date(creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <Link
      to={`/reporte/${id}`}
      className="bg-perla rounded-3xl-2 overflow-hidden flex items-center gap-3 p-3 active:scale-[0.98] transition-all"
    >
      <img
        src={url_imagen}
        alt=""
        className="w-14 h-14 object-cover rounded-2xl shrink-0 bg-yeso"
      />
      <div className="min-w-0 flex-1">
        <StatusBadge estado={estado} />
        <p className="text-xs text-tierra font-medium truncate mt-1">
          {CATEGORIA_NAMES[categoria_id] || 'Otro'}
        </p>
        <p className="text-[10px] text-arena mt-0.5">{fecha}</p>
      </div>
    </Link>
  );
}

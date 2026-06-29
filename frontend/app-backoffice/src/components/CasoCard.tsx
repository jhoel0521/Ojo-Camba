import { Link } from 'react-router-dom';
import { FileStack, CalendarClock, ImageOff } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { GrupoReporte } from '../lib/adminApi';
import { CATEGORIA_NAMES } from '../lib/categories';
import { getImageUrl } from '../lib/api';

export default function CasoCard({ grupo }: { grupo: GrupoReporte }) {
  const fechaCreado = new Date(grupo.creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const fechaETA = grupo.fecha_estimada_fin
    ? new Date(grupo.fecha_estimada_fin).toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const categoriaNombre = grupo.categoria_id
    ? (CATEGORIA_NAMES[grupo.categoria_id] ?? 'Otro')
    : null;

  const imagenSrc = grupo.preview_imagen ? getImageUrl(grupo.preview_imagen) : null;

  return (
    <Link
      to={`/grupos/${grupo.id}`}
      className="bg-perla rounded-3xl-3 flex gap-0 overflow-hidden hover:shadow-md active:scale-[0.99] transition-all border border-arcilla group"
    >
      {/* Thumbnail */}
      <div className="w-[88px] shrink-0 bg-yeso flex items-center justify-center overflow-hidden">
        {imagenSrc ? (
          <img
            src={imagenSrc}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ImageOff className="w-6 h-6 text-arcilla" />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-sm font-bold text-catedral font-mono leading-tight truncate">
            {grupo.codigo_obra}
          </span>
          <StatusBadge estado={grupo.estado_actual} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {categoriaNombre && (
            <span className="text-[11px] font-medium text-caoba">{categoriaNombre}</span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-arena">
            <FileStack className="w-3 h-3 shrink-0" />
            {grupo.total_reportes ?? 0} reporte{(grupo.total_reportes ?? 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-arena">{fechaCreado}</span>
          {fechaETA && (
            <span className="flex items-center gap-1 text-[11px] text-caoba">
              <CalendarClock className="w-3 h-3 shrink-0" />
              ETA {fechaETA}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

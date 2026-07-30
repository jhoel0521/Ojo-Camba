import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VisitaCaso } from '../lib/tecnicoApi';
import StatusBadge from './StatusBadge';

export default function VisitaCard({
  visita,
  mostrarOrden = false,
}: {
  visita: VisitaCaso;
  mostrarOrden?: boolean;
}) {
  const caso = visita.caso;
  if (!caso) return null;

  return (
    <Link
      to={`/visitas/${visita.id}`}
      className="flex min-h-[96px] items-center gap-3 rounded-3xl-3 bg-perla p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-selva"
    >
      {mostrarOrden && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-selva text-sm font-bold text-perla">
          {visita.orden_ruta ?? '–'}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-catedral">{caso.codigo_obra}</span>
          <StatusBadge estado={caso.estado_actual} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-arena">
          <span>{caso.total_reportes ?? '—'} reportes agrupados</span>
          {visita.fecha_planificada && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(`${visita.fecha_planificada}T00:00:00`).toLocaleDateString('es-BO')}
            </span>
          )}
          {visita.llegada_en && (
            <span className="inline-flex items-center gap-1 text-selva">
              <MapPin className="h-3.5 w-3.5" /> Llegada registrada
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-arena" aria-hidden="true" />
    </Link>
  );
}

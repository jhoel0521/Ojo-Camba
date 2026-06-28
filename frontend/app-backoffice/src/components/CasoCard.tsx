import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { GrupoReporte } from '../lib/adminApi';

export default function CasoCard({ grupo }: { grupo: GrupoReporte }) {
  const fecha = new Date(grupo.creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      to={`/grupos/${grupo.id}`}
      className="bg-perla rounded-3xl-2 p-4 block hover:shadow-md active:scale-[0.98] transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-catedral">{grupo.codigo_obra}</span>
        <StatusBadge estado={grupo.estado_actual} />
      </div>
      <div className="flex items-center gap-4 text-xs text-arena">
        <span>{grupo.total_reportes ?? 0} reportes</span>
        <span>{fecha}</span>
      </div>
    </Link>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen, Calendar } from 'lucide-react';
import { listGroups, type GrupoReporte } from '../lib/tecnicoApi';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';

export default function CasosPage() {
  const [grupos, setGrupos] = useState<GrupoReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listGroups(1, 50)
      .then((res) => setGrupos(res.data ?? []))
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-perla rounded-3xl-3 p-5 animate-pulse">
            <div className="h-4 bg-yeso rounded w-40 mb-3" />
            <div className="h-3 bg-yeso rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <FolderOpen className="w-5 h-5 text-selva" />
        <h2 className="font-semibold text-lg text-tierra">Casos de Obra</h2>
      </div>

      {grupos.length === 0 ? (
        <div className="text-center text-sm text-arena py-16">
          No hay Casos de Obra asignados todavia.
        </div>
      ) : (
        <ul className="space-y-3">
          {grupos.map((g) => (
            <li key={g.id}>
              <Link
                to={`/casos/${g.id}`}
                className="flex items-center justify-between gap-3 bg-perla rounded-3xl-3 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm text-catedral truncate">
                      {g.codigo_obra}
                    </span>
                    <StatusBadge estado={g.estado_actual} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-arena">
                    <span>{g.total_reportes ?? 0} reportes</span>
                    {g.fecha_estimada_fin && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(g.fecha_estimada_fin).toLocaleDateString('es-BO')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-arena shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

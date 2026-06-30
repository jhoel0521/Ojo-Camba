import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen, Calendar, RefreshCw } from 'lucide-react';
import { listGroups, type GrupoReporte } from '../lib/tecnicoApi';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

const LIMIT = 20;

export default function CasosPage() {
  const [grupos, setGrupos] = useState<GrupoReporte[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await listGroups(page, LIMIT);
        setGrupos(res.data ?? []);
        setTotal(res.total);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-selva" />
          <h2 className="font-semibold text-lg text-tierra">Casos de Obra</h2>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          aria-label="Actualizar"
          className="w-10 h-10 flex items-center justify-center rounded-2xl text-caoba hover:text-tierra hover:bg-yeso disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && grupos.length === 0 && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-5 animate-pulse">
              <div className="h-4 bg-yeso rounded w-40 mb-3" />
              <div className="h-3 bg-yeso rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && grupos.length === 0 && (
        <div className="text-center text-sm text-arena py-16">
          No hay Casos de Obra asignados todavia.
        </div>
      )}

      {grupos.length > 0 && (
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

      {!loading && !error && (
        <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}

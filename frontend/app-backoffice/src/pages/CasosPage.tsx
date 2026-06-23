import { useEffect, useState, useCallback } from 'react';
import { listGroups, type GrupoReporte } from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import CasoCard from '../components/CasoCard';
import Pagination from '../components/Pagination';

export default function CasosPage() {
  const [grupos, setGrupos] = useState<GrupoReporte[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listGroups(page);
      setGrupos(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-xl text-tierra">Casos de Obra</h2>
          <p className="text-sm text-arena mt-0.5">{total} casos registrados</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs font-medium text-caoba hover:text-tierra disabled:opacity-50 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {loading && grupos.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-4 animate-pulse">
              <div className="h-4 bg-yeso rounded w-28 mb-3" />
              <div className="h-3 bg-yeso rounded w-40" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && grupos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-arena">No hay casos de obra registrados.</p>
        </div>
      )}

      {grupos.length > 0 && (
        <div className="space-y-3">
          {grupos.map((g) => (
            <CasoCard key={g.id} grupo={g} />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
    </div>
  );
}

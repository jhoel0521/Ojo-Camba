import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, FolderSearch } from 'lucide-react';
import { listGroups, type GrupoReporte } from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import CasoCard from '../components/CasoCard';
import Pagination from '../components/Pagination';

const ESTADOS = [
  { label: 'Todos', value: '' },
  { label: 'Aceptado', value: 'Aceptado' },
  { label: 'En campo', value: 'ValidacionEnCampo' },
  { label: 'En trabajo', value: 'EnTrabajo' },
  { label: 'Finalizado', value: 'Finalizado' },
];

const LIMIT = 20;

export default function CasosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [grupos, setGrupos] = useState<GrupoReporte[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Se inicializa desde la URL para que los links con ?estado= (ej. desde las
  // recomendaciones del Dashboard) precarguen el filtro correcto, no "Todos".
  const [estadoFiltro, setEstadoFiltro] = useState(() => searchParams.get('estado') ?? '');

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await listGroups(page, LIMIT, estadoFiltro || undefined);
        setGrupos(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, estadoFiltro],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleFiltro(valor: string) {
    setEstadoFiltro(valor);
    setPage(1);
    setSearchParams(valor ? { estado: valor } : {}, { replace: true });
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-xl text-tierra">Casos de Obra</h2>
          <p className="text-sm text-arena mt-0.5">Obras activas y su historial de reportes</p>
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

      {/* Filtros por estado */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {ESTADOS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleFiltro(value)}
            className={`h-9 min-h-[44px] px-4 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors shrink-0
              ${
                estadoFiltro === value
                  ? 'bg-tierra text-perla shadow-sm'
                  : 'bg-yeso text-catedral hover:bg-arcilla hover:text-tierra'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skeleton de carga */}
      {loading && grupos.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-perla rounded-3xl-3 h-[72px] animate-pulse flex overflow-hidden border border-arcilla"
            >
              <div className="w-[88px] bg-yeso shrink-0" />
              <div className="flex-1 p-3.5 space-y-2">
                <div className="h-3.5 bg-yeso rounded w-24" />
                <div className="h-3 bg-yeso rounded w-40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Lista */}
      {!loading && !error && grupos.length === 0 && (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <FolderSearch className="w-10 h-10 text-arcilla" />
          <p className="text-sm text-arena">
            {estadoFiltro
              ? `No hay casos con estado "${estadoFiltro}".`
              : 'No hay casos de obra registrados.'}
          </p>
          {estadoFiltro && (
            <button
              onClick={() => handleFiltro('')}
              className="text-xs text-caoba underline underline-offset-2"
            >
              Ver todos
            </button>
          )}
        </div>
      )}

      {grupos.length > 0 && (
        <div className="space-y-3">
          {grupos.map((g) => (
            <CasoCard key={g.id} grupo={g} />
          ))}
        </div>
      )}

      {/* Paginación siempre visible cuando hay datos o cuando terminó de cargar */}
      {!loading && !error && (
        <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}

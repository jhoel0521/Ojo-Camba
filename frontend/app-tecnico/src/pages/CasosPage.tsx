import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen, Calendar, RefreshCw, Compass } from 'lucide-react';
import { listGroups, listGroupsNearby, type GrupoReporte } from '../lib/tecnicoApi';
import { useGeolocation } from '../hooks/useGeolocation';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

const LIMIT = 20;

type TabMode = 'all' | 'nearby';

const ESTADOS = [
  { label: 'Todos', value: '' },
  { label: 'Aceptado', value: 'Aceptado' },
  { label: 'En campo', value: 'ValidacionEnCampo' },
  { label: 'En trabajo', value: 'EnTrabajo' },
  { label: 'Finalizado', value: 'Finalizado' },
];

export default function CasosPage() {
  const [mode, setMode] = useState<TabMode>('all');
  const [grupos, setGrupos] = useState<GrupoReporte[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const gps = useGeolocation();

  const fetchAll = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await listGroups(page, LIMIT, estadoFiltro || undefined);
        setGrupos(res.data ?? []);
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

  function handleFiltro(valor: string) {
    setEstadoFiltro(valor);
    setPage(1);
  }

  const fetchNearby = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await gps.capture();
    } catch {
      setError('No se pudo obtener tu ubicacion.');
      setLoading(false);
    }
  }, [gps]);

  useEffect(() => {
    if (mode === 'all') {
      fetchAll();
    }
  }, [mode, fetchAll]);

  useEffect(() => {
    if (mode === 'nearby' && gps.status === 'success' && gps.fix) {
      listGroupsNearby(gps.fix.lat, gps.fix.lng)
        .then((data) => {
          setGrupos(data);
          setTotal(data.length);
        })
        .catch((err) => setError(friendlyError(err)))
        .finally(() => setLoading(false));
    }
  }, [mode, gps.status, gps.fix]);

  useEffect(() => {
    if (mode === 'nearby' && gps.status === 'error') {
      setError(gps.error ?? 'No se pudo obtener tu ubicacion.');
      setLoading(false);
    }
  }, [mode, gps.status, gps.error]);

  const handleRefresh = () => {
    if (mode === 'all') fetchAll(true);
    else fetchNearby();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-selva" />
          <h2 className="font-semibold text-lg text-tierra">Casos de Obra</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          aria-label="Actualizar"
          className="w-10 h-10 flex items-center justify-center rounded-2xl text-caoba hover:text-tierra hover:bg-yeso disabled:opacity-40 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing || (mode === 'nearby' && gps.status === 'loading') ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Toggle Todos / Cercanos */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => {
            setMode('all');
            setPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-3xl-3 transition-colors ${
            mode === 'all'
              ? 'bg-selva text-perla'
              : 'bg-perla text-arena border border-arcilla hover:border-selva'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Todos
        </button>
        <button
          onClick={() => {
            setMode('nearby');
            setGrupos([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-3xl-3 transition-colors ${
            mode === 'nearby'
              ? 'bg-selva text-perla'
              : 'bg-perla text-arena border border-arcilla hover:border-selva'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Cercanos
        </button>
      </div>

      {/* Filtro por estado (solo aplica al modo Todos): radios reales, en grilla que se envuelve — sin scroll horizontal */}
      {mode === 'all' && (
        <div
          role="radiogroup"
          aria-label="Filtrar por estado"
          className="flex flex-wrap gap-2 mb-5"
        >
          {ESTADOS.map(({ label, value }) => {
            const checked = estadoFiltro === value;
            return (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="estado-filtro"
                  value={value}
                  checked={checked}
                  onChange={() => handleFiltro(value)}
                  className="sr-only"
                />
                <span
                  className={`flex items-center justify-center h-11 px-4 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors ${
                    checked
                      ? 'bg-tierra text-perla shadow-sm'
                      : 'bg-yeso text-catedral hover:bg-arcilla hover:text-tierra'
                  }`}
                >
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      )}

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
        <div className="text-center text-sm text-arena py-16 space-y-2">
          <p>
            {mode === 'nearby'
              ? 'No hay Casos de Obra cercanos a tu ubicacion.'
              : estadoFiltro
                ? `No hay casos con estado "${estadoFiltro}".`
                : 'No hay Casos de Obra asignados todavia.'}
          </p>
          {mode === 'all' && estadoFiltro && (
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

      {mode === 'all' && !loading && !error && (
        <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, FolderSearch, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fichaInput, setFichaInput] = useState(() => searchParams.get('ficha') ?? '');

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const estado = searchParams.get('estado') ?? '';
  const ficha = searchParams.get('ficha') ?? '';
  const desde = searchParams.get('desde') ?? '';
  const hasta = searchParams.get('hasta') ?? '';
  const orden: 'recientes' | 'antiguos' =
    searchParams.get('orden') === 'antiguos' ? 'antiguos' : 'recientes';
  const hayFiltros = Boolean(estado || ficha || desde || hasta || orden === 'antiguos');

  const filtros = useMemo(
    () => ({ estado, ficha, desde, hasta, orden }),
    [estado, ficha, desde, hasta, orden],
  );

  const actualizarParametros = useCallback(
    (cambios: Record<string, string | undefined>) => {
      setSearchParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          Object.entries(cambios).forEach(([clave, valor]) => {
            if (valor) siguientes.set(clave, valor);
            else siguientes.delete(clave);
          });
          return siguientes;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await listGroups(page, LIMIT, filtros);
        setGrupos(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filtros],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setFichaInput(ficha);
  }, [ficha]);

  function aplicarFicha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    actualizarParametros({ ficha: fichaInput.trim() || undefined, page: undefined });
  }

  function cambiarEstado(valor: string) {
    actualizarParametros({ estado: valor || undefined, page: undefined });
  }

  function limpiarFiltros() {
    setFichaInput('');
    actualizarParametros({
      estado: undefined,
      ficha: undefined,
      desde: undefined,
      hasta: undefined,
      orden: undefined,
      page: undefined,
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-semibold text-xl text-tierra">Casos de Obra</h2>
          <p className="text-sm text-arena mt-0.5">
            Encuentra una ficha y ordena el historial de obras.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          aria-label="Actualizar casos"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl text-caoba hover:text-tierra hover:bg-yeso disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <section
        className="bg-perla rounded-3xl-3 p-4 mb-5 border border-arcilla space-y-4"
        aria-label="Filtros de casos"
      >
        <form onSubmit={aplicarFicha} className="flex gap-2">
          <label className="sr-only" htmlFor="buscar-ficha">
            Buscar por ficha
          </label>
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-arena"
              aria-hidden="true"
            />
            <input
              id="buscar-ficha"
              type="search"
              value={fichaInput}
              onChange={(event) => setFichaInput(event.target.value)}
              placeholder="Buscar por ficha: O-26-0000123"
              className="min-h-[48px] w-full bg-lienzo border border-arcilla rounded-pill pl-11 pr-4 text-sm text-tierra placeholder:text-almendra focus:outline-none focus:border-caoba"
            />
          </div>
          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-pill bg-tierra text-perla text-sm font-semibold hover:bg-catedral transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ladrillo mb-1">
              <CalendarDays className="w-3.5 h-3.5" /> Desde
            </span>
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(event) =>
                actualizarParametros({ desde: event.target.value || undefined, page: undefined })
              }
              className="min-h-[44px] w-full bg-lienzo border border-arcilla rounded-2xl px-3 text-sm text-tierra focus:outline-none focus:border-caoba"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ladrillo mb-1">
              <CalendarDays className="w-3.5 h-3.5" /> Hasta
            </span>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(event) =>
                actualizarParametros({ hasta: event.target.value || undefined, page: undefined })
              }
              className="min-h-[44px] w-full bg-lienzo border border-arcilla rounded-2xl px-3 text-sm text-tierra focus:outline-none focus:border-caoba"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ladrillo mb-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Orden
            </span>
            <select
              value={orden}
              onChange={(event) =>
                actualizarParametros({
                  orden: event.target.value === 'antiguos' ? 'antiguos' : undefined,
                  page: undefined,
                })
              }
              className="min-h-[44px] w-full bg-lienzo border border-arcilla rounded-2xl px-3 text-sm text-tierra focus:outline-none focus:border-caoba"
            >
              <option value="recientes">Más recientes primero</option>
              <option value="antiguos">Más antiguos primero</option>
            </select>
          </label>
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
          aria-label="Filtrar por estado"
        >
          {ESTADOS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => cambiarEstado(value)}
              className={`min-h-[44px] px-4 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${estado === value ? 'bg-tierra text-perla shadow-sm' : 'bg-yeso text-catedral hover:bg-arcilla hover:text-tierra'}`}
            >
              {label}
            </button>
          ))}
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="min-h-[44px] px-3 rounded-pill text-xs font-semibold text-caoba hover:bg-yeso whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </section>

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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && grupos.length === 0 && (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <FolderSearch className="w-10 h-10 text-arcilla" />
          <p className="text-sm text-arena">No encontramos casos con esos filtros.</p>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="min-h-[44px] px-4 rounded-pill text-xs font-semibold text-caoba hover:bg-yeso"
            >
              Limpiar filtros
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

      {!loading && !error && (
        <Pagination
          page={page}
          total={total}
          limit={LIMIT}
          onPageChange={(nextPage) => actualizarParametros({ page: String(nextPage) })}
        />
      )}
    </div>
  );
}

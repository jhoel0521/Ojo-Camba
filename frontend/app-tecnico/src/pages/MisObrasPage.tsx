import { ClipboardList, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listMisObras, type VisitaCaso } from '../lib/tecnicoApi';
import { friendlyError } from '../lib/errors';
import VisitaCard from '../components/VisitaCard';

export default function MisObrasPage() {
  const [visitas, setVisitas] = useState<VisitaCaso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await listMisObras(1, 100);
      setVisitas(respuesta.data);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-5 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ladrillo">
            Bandeja personal
          </p>
          <h1 className="mt-1 text-xl font-semibold text-tierra">Mis obras</h1>
          <p className="mt-1 text-sm text-arena">Solo Casos con una visita asignada a ti.</p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-caoba hover:bg-yeso"
          aria-label="Actualizar mis obras"
        >
          <RefreshCw className={`h-5 w-5 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {cargando && <div className="h-28 animate-pulse rounded-3xl-3 bg-perla" />}
      {!cargando && !error && visitas.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl-3 bg-perla px-6 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-arcilla" />
          <p className="mt-3 text-sm font-semibold text-tierra">No tienes obras asignadas</p>
          <p className="mt-1 text-sm text-arena">
            Tu responsable verá nuevas visitas antes de distribuirlas.
          </p>
        </div>
      )}
      {!cargando && visitas.length > 0 && (
        <ul className="space-y-3">
          {visitas.map((visita) => (
            <li key={visita.id}>
              <VisitaCard visita={visita} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

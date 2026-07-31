import { CalendarDays, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listMiRuta, type VisitaCaso } from '../lib/tecnicoApi';
import { friendlyError } from '../lib/errors';
import VisitaCard from '../components/VisitaCard';

function fechaLocal(): string {
  const hoy = new Date();
  const zona = hoy.getTimezoneOffset() * 60_000;
  return new Date(hoy.getTime() - zona).toISOString().slice(0, 10);
}

export default function MiRutaPage() {
  const [fecha, setFecha] = useState(fechaLocal);
  const [visitas, setVisitas] = useState<VisitaCaso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    setError('');
    listMiRuta(fecha)
      .then((respuesta) => setVisitas(respuesta.data))
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setCargando(false));
  }, [fecha]);

  return (
    <div className="space-y-5 pb-3">
      <section className="rounded-hero bg-tierra p-6 text-perla">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-arena">
          Recorrido diario
        </p>
        <h1 className="mt-1 text-xl font-semibold">Mi ruta</h1>
        <p className="mt-2 text-sm leading-6 text-almendra">
          Completa cada parada antes de pasar a la siguiente.
        </p>
      </section>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ladrillo">
          <CalendarDays className="h-4 w-4" /> Fecha
        </span>
        <input
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          className="min-h-12 w-full rounded-3xl-2 border border-arcilla bg-perla px-4 text-sm text-tierra"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {cargando && <div className="h-28 animate-pulse rounded-3xl-3 bg-perla" />}
      {!cargando && !error && visitas.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl-3 bg-perla px-6 py-16 text-center">
          <Navigation className="h-10 w-10 text-arcilla" />
          <p className="mt-3 text-sm font-semibold text-tierra">Sin ruta para esta fecha</p>
          <p className="mt-1 text-sm text-arena">
            Cuando tu responsable distribuya visitas, aparecerán aquí.
          </p>
        </div>
      )}
      {!cargando && visitas.length > 0 && (
        <ol className="space-y-3">
          {visitas.map((visita) => (
            <li key={visita.id}>
              <VisitaCard visita={visita} mostrarOrden />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

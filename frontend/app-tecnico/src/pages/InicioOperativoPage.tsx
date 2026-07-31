import { AlertTriangle, ClipboardList, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listMisObras, type VisitaCaso } from '../lib/tecnicoApi';
import { friendlyError } from '../lib/errors';
import { useOperacionContext } from '../components/OperacionProvider';

export default function InicioOperativoPage() {
  const { contexto, cargando: cargandoContexto } = useOperacionContext();
  const [visitas, setVisitas] = useState<VisitaCaso[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listMisObras(1, 100)
      .then((respuesta) => setVisitas(respuesta.data))
      .catch((err) => setError(friendlyError(err)));
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const hoyTotal = visitas.filter((visita) => visita.fecha_planificada === hoy).length;
  const pendientesLlegada = visitas.filter((visita) => !visita.llegada_en).length;
  const esCoordinador = contexto?.roles.includes('coordinador_operativo');

  return (
    <div className="space-y-5 pb-3">
      <section className="rounded-hero bg-catedral p-6 text-perla">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-arena">
          {esCoordinador ? 'Coordinación operativa' : 'Jornada de campo'}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {esCoordinador ? 'Excepciones por atender' : 'Tu trabajo de hoy'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-almendra">
          {esCoordinador
            ? 'Revisa alertas, retrasos y solicitudes de apoyo antes de reasignar recursos.'
            : 'La ruta reúne solo las visitas que tu responsable te asignó.'}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-3xl-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!esCoordinador && (
        <section className="grid grid-cols-2 gap-3" aria-label="Resumen de jornada">
          <article className="rounded-3xl-3 bg-perla p-4 shadow-sm">
            <p className="text-2xl font-semibold text-tierra">{hoyTotal}</p>
            <p className="mt-1 text-xs text-arena">Visitas para hoy</p>
          </article>
          <article className="rounded-3xl-3 bg-perla p-4 shadow-sm">
            <p className="text-2xl font-semibold text-tierra">{pendientesLlegada}</p>
            <p className="mt-1 text-xs text-arena">Pendientes de llegada</p>
          </article>
        </section>
      )}

      {contexto?.es_responsable && (
        <div className="flex min-h-[52px] items-center gap-3 rounded-3xl-2 border border-arcilla bg-perla px-4 text-sm text-tierra">
          <AlertTriangle className="h-5 w-5 text-sol-camba" />
          Eres responsable de cuadrilla: tendrás una vista adicional de distribución y alertas.
        </div>
      )}

      {esCoordinador ? (
        <div className="rounded-3xl-3 bg-perla p-5 text-sm leading-6 text-arena shadow-sm">
          La bandeja de excepciones conectará sobrecarga, retrasos y solicitudes de apoyo en el
          siguiente bloque.
        </div>
      ) : (
        <Link
          to="/mi-ruta"
          className="flex min-h-14 items-center justify-center gap-2 rounded-pill bg-selva px-6 text-sm font-semibold text-perla shadow-md"
        >
          <Navigation className="h-5 w-5" /> Abrir mi ruta
        </Link>
      )}

      <Link
        to="/mis-obras"
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-pill px-5 text-sm font-semibold text-caoba hover:bg-yeso"
      >
        <ClipboardList className="h-4 w-4" /> Ver todas mis obras
      </Link>

      {cargandoContexto && (
        <p className="text-center text-xs text-arena">Cargando tu perfil operativo…</p>
      )}
    </div>
  );
}

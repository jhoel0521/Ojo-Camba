import { ArrowLeft, Camera, MapPin, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getImageUrl } from '../lib/api';
import { getVisita, registrarLlegadaVisita, type DetalleVisita } from '../lib/tecnicoApi';
import { useGeolocation } from '../hooks/useGeolocation';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';

export default function DetalleVisitaPage() {
  const { id } = useParams<{ id: string }>();
  const visitaId = Number(id);
  const [detalle, setDetalle] = useState<DetalleVisita | null>(null);
  const [error, setError] = useState('');
  const [enviandoLlegada, setEnviandoLlegada] = useState(false);
  const gps = useGeolocation();

  useEffect(() => {
    if (!Number.isInteger(visitaId)) return;
    getVisita(visitaId)
      .then(setDetalle)
      .catch((err) => setError(friendlyError(err)));
  }, [visitaId]);

  const confirmarLlegada = async () => {
    try {
      setEnviandoLlegada(true);
      const fix = await gps.capture();
      await registrarLlegadaVisita(visitaId, fix.lat, fix.lng);
      setDetalle((actual) =>
        actual
          ? { ...actual, visita: { ...actual.visita, llegada_en: new Date().toISOString() } }
          : actual,
      );
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setEnviandoLlegada(false);
    }
  };

  if (!Number.isInteger(visitaId)) return <p className="text-sm text-red-700">Visita inválida.</p>;
  if (!detalle && !error)
    return <div className="h-36 animate-pulse rounded-3xl-3 bg-perla" aria-busy="true" />;
  if (!detalle)
    return (
      <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
        {error}
      </p>
    );

  return (
    <div className="space-y-5 pb-24">
      <Link
        to="/mis-obras"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-caoba"
      >
        <ArrowLeft className="h-4 w-4" /> Mis obras
      </Link>
      <section className="rounded-3xl-3 bg-perla p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ladrillo">
              Caso de Obra
            </p>
            <h1 className="mt-1 text-xl font-semibold text-catedral">{detalle.caso.codigo_obra}</h1>
          </div>
          <StatusBadge estado={detalle.caso.estado_actual} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-arena">
          <UsersRound className="h-4 w-4" />
          {detalle.agrupacion.total_reportes} reportes ciudadanos agrupados
        </div>
      </section>

      <section className="rounded-3xl-3 bg-perla p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-tierra">Reportes que originaron esta obra</h2>
        <ul className="mt-4 space-y-3">
          {detalle.agrupacion.reportes.map((reporte) => (
            <li key={reporte.id} className="flex gap-3 rounded-3xl-2 bg-lienzo p-3">
              {reporte.url_imagen ? (
                <img
                  src={getImageUrl(reporte.url_imagen)}
                  alt={`Evidencia del reporte ${reporte.id}`}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yeso text-arena">
                  <Camera className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 text-xs text-arena">
                <p className="font-semibold text-tierra">Reporte #{reporte.id}</p>
                <p className="mt-1">
                  Categoría {reporte.categoria_id} · {reporte.gravedad}
                </p>
                <p className="mt-1">
                  {Number(reporte.lat).toFixed(5)}, {Number(reporte.lng).toFixed(5)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-arcilla bg-perla p-4">
        <div className="mx-auto max-w-sm">
          <button
            type="button"
            disabled={Boolean(detalle.visita.llegada_en) || enviandoLlegada}
            onClick={confirmarLlegada}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-pill bg-selva px-6 text-sm font-semibold text-perla shadow-md disabled:opacity-60"
          >
            <MapPin className="h-5 w-5" />
            {detalle.visita.llegada_en
              ? 'Llegada registrada'
              : enviandoLlegada
                ? 'Obteniendo GPS…'
                : 'Registrar llegada'}
          </button>
        </div>
      </div>
    </div>
  );
}

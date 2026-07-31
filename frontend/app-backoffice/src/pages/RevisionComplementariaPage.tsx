import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BarChart3, Clock3, History, RefreshCw } from 'lucide-react';
import {
  getRejectionQuality,
  listReviewAlerts,
  listReviewHistory,
  type AlertaRevision,
  type CalidadRechazos,
  type PendingReport,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import { CATEGORIA_NAMES } from '../lib/categories';

function VolverBandeja() {
  return (
    <Link
      to="/revisar"
      className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-arcilla bg-perla px-4 text-sm font-semibold text-ladrillo hover:bg-yeso"
    >
      <ArrowLeft className="h-4 w-4" /> Bandeja
    </Link>
  );
}

export function AlertasRevisionPage() {
  const [alertas, setAlertas] = useState<AlertaRevision[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAlertas(await listReviewAlerts());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
            Backoffice
          </p>
          <h2 className="mt-1 text-xl font-semibold text-tierra">Alertas de revisión</h2>
          <p className="mt-1 text-sm text-arena">
            Señales para priorizar la bandeja; no asignan cuadrillas.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          aria-label="Actualizar alertas"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-pill bg-yeso text-ladrillo hover:bg-arcilla"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>
      <VolverBandeja />
      {error && (
        <p className="rounded-3xl-2 border border-ladrillo bg-yeso p-4 text-sm text-ladrillo">
          {error}
        </p>
      )}
      {!loading && !error && alertas.length === 0 && (
        <div className="rounded-3xl-3 bg-perla p-8 text-center text-sm text-arena">
          No hay alertas prioritarias en este momento.
        </div>
      )}
      <div className="grid gap-3">
        {alertas.map((alerta, index) => (
          <article
            key={`${alerta.tipo}-${alerta.reporte_id ?? alerta.zona ?? index}`}
            className="rounded-3xl-3 border border-arcilla bg-perla p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yeso text-ladrillo">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-tierra">{alerta.titulo}</h3>
                <p className="mt-1 text-sm text-arena">{alerta.detalle}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HistorialRevisionPage() {
  const [reportes, setReportes] = useState<PendingReport[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listReviewHistory(1, 50)
      .then((respuesta) => setReportes(respuesta.data))
      .catch((err) => setError(friendlyError(err)));
  }, []);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
          Backoffice
        </p>
        <h2 className="mt-1 text-xl font-semibold text-tierra">Historial de decisiones</h2>
        <p className="mt-1 text-sm text-arena">Aceptaciones y descartes digitales recientes.</p>
      </header>
      <VolverBandeja />
      {error && (
        <p className="rounded-3xl-2 border border-ladrillo bg-yeso p-4 text-sm text-ladrillo">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {reportes.map((reporte) => (
          <article
            key={reporte.id}
            className="flex items-center gap-3 rounded-3xl-3 border border-arcilla bg-perla p-4"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yeso text-ladrillo">
              <History className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-tierra">
                Reporte #{reporte.id} · {CATEGORIA_NAMES[reporte.categoria_id] ?? 'Otro'}
              </p>
              <p className="mt-1 text-xs text-arena">
                {reporte.estado === 'Rechazado'
                  ? 'Descarte digital'
                  : 'Admitido en un Caso de Obra'}{' '}
                · {new Date(reporte.creado_en).toLocaleString('es-BO')}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CalidadRevisionPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [calidad, setCalidad] = useState<CalidadRechazos | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCalidad(await getRejectionQuality(desde || undefined, hasta || undefined));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
          Mejora continua
        </p>
        <h2 className="mt-1 text-xl font-semibold text-tierra">Calidad de admisiones</h2>
        <p className="mt-1 text-sm text-arena">
          Indicador de capacitación y reglas, nunca una sanción automática.
        </p>
      </header>
      <VolverBandeja />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          cargar();
        }}
        className="grid gap-3 rounded-3xl-3 border border-arcilla bg-perla p-4 sm:grid-cols-3"
      >
        <label className="text-xs font-semibold text-ladrillo">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-perla px-4 text-sm text-tierra"
          />
        </label>
        <label className="text-xs font-semibold text-ladrillo">
          Hasta
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(event) => setHasta(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-3xl-3 border border-arcilla bg-perla px-4 text-sm text-tierra"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 self-end rounded-pill bg-catedral px-5 text-sm font-semibold text-perla hover:bg-tierra"
        >
          Aplicar período
        </button>
      </form>
      {error && (
        <p className="rounded-3xl-2 border border-ladrillo bg-yeso p-4 text-sm text-ladrillo">
          {error}
        </p>
      )}
      {calidad && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Admisiones', calidad.total_admisiones],
              ['Rechazos de campo', calidad.total_rechazos_campo],
              ['Proporción', `${calidad.proporcion_rechazo}%`],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-3xl-3 bg-catedral p-5 text-perla">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-arena">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{loading ? '—' : value}</p>
              </article>
            ))}
          </div>
          <div className="rounded-3xl-3 border border-arcilla bg-perla p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-tierra">
              <BarChart3 className="h-4 w-4 text-caoba" /> Por categoría de rechazo en campo
            </h3>
            <div className="mt-4 space-y-3">
              {calidad.por_categoria.length === 0 ? (
                <p className="text-sm text-arena">
                  Sin rechazos de campo en el período seleccionado.
                </p>
              ) : (
                calidad.por_categoria.map((fila) => (
                  <div
                    key={`${fila.categoria_id}-${fila.categoria}`}
                    className="flex items-center justify-between gap-3 border-b border-arcilla pb-3 last:border-0"
                  >
                    <span className="text-sm text-tierra">{fila.categoria}</span>
                    <span className="rounded-pill bg-yeso px-3 py-1 text-xs font-semibold text-ladrillo">
                      {fila.total} · {fila.proporcion}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      {loading && (
        <p className="flex items-center gap-2 text-sm text-arena">
          <Clock3 className="h-4 w-4 animate-pulse" /> Calculando indicador…
        </p>
      )}
    </section>
  );
}

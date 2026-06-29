import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Loader2,
  Calendar,
  Package,
  Crosshair,
} from 'lucide-react';
import {
  getGroup,
  getCaseTimeline,
  addActualizacion,
  type GrupoReporte,
  type Actualizacion,
} from '../lib/tecnicoApi';
import {
  actualizacionSchema,
  buildActualizacionPayload,
  type ActualizacionForm,
  type GpsFix,
} from '../lib/actualizacion';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuthStore } from '../store/authStore';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';
import { getImageUrl } from '../lib/api';

export default function CasoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const numId = parseInt(id ?? '', 10);
  const user = useAuthStore((s) => s.user);

  const [grupo, setGrupo] = useState<GrupoReporte | null>(null);
  const [timeline, setTimeline] = useState<Actualizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const gps = useGeolocation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActualizacionForm>({ resolver: zodResolver(actualizacionSchema) });

  useEffect(() => {
    if (isNaN(numId)) {
      setError('Caso invalido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getGroup(numId), getCaseTimeline(numId)])
      .then(([g, t]) => {
        setGrupo(g);
        setTimeline(t);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [numId]);

  const onSubmit = async (data: ActualizacionForm) => {
    if (isNaN(numId) || !user) return;
    setSending(true);
    setSuccessMsg('');
    setError('');
    try {
      const fix: GpsFix | null = gps.status === 'success' ? gps.fix : null;
      const payload = buildActualizacionPayload(user.id, data, fix);
      await addActualizacion(numId, payload);

      const freshTimeline = await getCaseTimeline(numId);
      setTimeline(freshTimeline);
      reset({ comentario: '', recursos_solicitados: '', fecha_estimada_fin: '' });
      gps.reset();
      setSuccessMsg('Actualizacion registrada exitosamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-6 bg-yeso rounded w-48 animate-pulse" />
        <div className="h-40 bg-perla rounded-3xl-3 animate-pulse" />
      </div>
    );
  }

  if (error && !grupo) {
    return (
      <div>
        <BackLink />
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!grupo) return null;

  return (
    <div data-testid="caso-detalle">
      <BackLink />

      <div className="bg-perla rounded-3xl-3 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg text-catedral" data-testid="codigo-obra">
            {grupo.codigo_obra}
          </h2>
          <StatusBadge estado={grupo.estado_actual} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-arena">
          <span>{grupo.total_reportes ?? 0} reportes agrupados</span>
          <span>Creado {new Date(grupo.creado_en).toLocaleDateString('es-BO')}</span>
          {grupo.fecha_estimada_fin && (
            <span>Entrega est.: {new Date(grupo.fecha_estimada_fin).toLocaleDateString('es-BO')}</span>
          )}
        </div>
      </div>

      {/* Formulario de bitacora diaria (sin cambio de estado) */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        data-testid="form-actualizacion"
        className="bg-perla rounded-3xl-3 p-5 mb-8 shadow-sm space-y-4"
      >
        <h3 className="font-semibold text-sm text-tierra">Registrar avance diario</h3>

        {successMsg && (
          <div
            role="status"
            data-testid="success-msg"
            className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3"
          >
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
        )}

        {error && grupo && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="comentario"
            className="block text-xs font-semibold text-ladrillo uppercase tracking-wide mb-1.5"
          >
            Comentario del avance *
          </label>
          <textarea
            id="comentario"
            {...register('comentario')}
            rows={3}
            placeholder="Describe el trabajo realizado hoy..."
            className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-selva transition-colors resize-none"
          />
          {errors.comentario && (
            <p className="text-xs text-red-600 mt-1">{errors.comentario.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="recursos_solicitados"
            className="block text-xs font-semibold text-ladrillo uppercase tracking-wide mb-1.5"
          >
            <Package className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Recursos solicitados (opcional)
          </label>
          <input
            id="recursos_solicitados"
            {...register('recursos_solicitados')}
            type="text"
            placeholder="Cemento, maquinaria, personal..."
            className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-selva transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="fecha_estimada_fin"
            className="block text-xs font-semibold text-ladrillo uppercase tracking-wide mb-1.5"
          >
            <Calendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Fecha estimada de fin (opcional)
          </label>
          <input
            id="fecha_estimada_fin"
            {...register('fecha_estimada_fin')}
            type="date"
            className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra w-full focus:outline-none focus:border-selva transition-colors"
          />
        </div>

        {/* Correccion GPS */}
        <div className="rounded-3xl-3 border border-arcilla p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ladrillo uppercase tracking-wide mb-0.5">
                <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Correccion GPS (opcional)
              </p>
              <p className="text-xs text-arena">
                Captura tu ubicacion actual para corregir las coordenadas del caso.
              </p>
            </div>
            <button
              type="button"
              onClick={gps.capture}
              disabled={gps.status === 'loading'}
              data-testid="btn-gps"
              className="flex items-center gap-1.5 bg-lienzo border border-selva text-selva text-xs font-medium px-3 py-2 rounded-3xl-3 hover:bg-selva hover:text-perla disabled:opacity-60 transition-colors shrink-0"
            >
              {gps.status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              {gps.status === 'success' ? 'Recapturar' : 'Capturar GPS'}
            </button>
          </div>

          {gps.status === 'success' && gps.fix && (
            <p data-testid="gps-fix" className="text-xs text-green-700 mt-2">
              Ubicacion capturada: {gps.fix.lat.toFixed(6)}, {gps.fix.lng.toFixed(6)}
              {gps.accuracy != null && ` (±${Math.round(gps.accuracy)} m)`}
            </p>
          )}
          {gps.status === 'error' && gps.error && (
            <p className="text-xs text-red-600 mt-2">{gps.error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={sending}
          data-testid="btn-enviar"
          className="w-full flex items-center justify-center gap-2 bg-selva text-perla font-medium text-sm px-8 py-3.5 rounded-3xl-3 shadow-md hover:brightness-110 disabled:opacity-60 transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {sending ? 'Registrando...' : 'Registrar avance'}
        </button>
      </form>

      {/* Historial / bitacora */}
      <div>
        <h3 className="font-semibold text-sm text-tierra mb-4">Bitacora de actualizaciones</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-arena text-center py-8">
            Aun no hay actualizaciones para este caso.
          </p>
        ) : (
          <ol data-testid="timeline" className="space-y-3">
            {timeline.map((a) => (
              <li key={a.id} className="bg-perla rounded-3xl-3 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-arena">
                    {new Date(a.creado_en).toLocaleString('es-BO')}
                  </span>
                  {a.estado_nuevo && <StatusBadge estado={a.estado_nuevo} />}
                </div>
                <p className="text-sm text-tierra whitespace-pre-line">{a.comentario}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-arena">
                  {a.recursos_solicitados && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {a.recursos_solicitados}
                    </span>
                  )}
                  {a.fecha_estimada_fin && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.fecha_estimada_fin).toLocaleDateString('es-BO')}
                    </span>
                  )}
                  {a.lat_actualizada != null && a.lng_actualizada != null && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {Number(a.lat_actualizada).toFixed(5)}, {Number(a.lng_actualizada).toFixed(5)}
                    </span>
                  )}
                </div>
                {a.url_imagen && (
                  <img
                    src={getImageUrl(a.url_imagen)}
                    alt="Evidencia"
                    className="mt-3 rounded-2xl max-h-48 object-cover"
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-sm text-selva hover:brightness-90 mb-4 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver a Casos
    </Link>
  );
}

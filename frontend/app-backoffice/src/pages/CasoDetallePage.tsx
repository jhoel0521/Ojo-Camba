import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Send,
  Images,
  ClipboardList,
  MapPin,
  Smartphone,
  ImageOff,
  CalendarClock,
  Wrench,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  getGroup,
  getCaseTimeline,
  updateCase,
  getGroupReports,
  type GrupoReporte,
  type Actualizacion,
  type GroupedReport,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';
import { getImageUrl } from '../lib/api';
import { CATEGORIA_NAMES } from '../lib/categories';

const updateSchema = z.object({
  comentario: z.string().min(1, 'El comentario es obligatorio'),
  estado_nuevo: z.string().optional(),
  recursos_solicitados: z.string().optional(),
  fecha_estimada_fin: z.string().optional(),
});

type UpdateForm = z.infer<typeof updateSchema>;

const ESTADOS_VALIDOS = ['Aceptado', 'ValidacionEnCampo', 'EnTrabajo', 'Finalizado'];

export default function CasoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [grupo, setGrupo] = useState<GrupoReporte | null>(null);
  const [timeline, setTimeline] = useState<Actualizacion[]>([]);
  const [reportes, setReportes] = useState<GroupedReport[]>([]);
  const [detailReporte, setDetailReporte] = useState<GroupedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateForm>({ resolver: zodResolver(updateSchema) });

  useEffect(() => {
    const numId = parseInt(id ?? '', 10);
    if (!id || isNaN(numId)) return;
    setLoading(true);
    setError('');
    Promise.all([getGroup(numId), getCaseTimeline(numId), getGroupReports(numId)])
      .then(([g, t, r]) => {
        setGrupo(g);
        setTimeline(t);
        setReportes(r);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (data: UpdateForm) => {
    const numId = parseInt(id ?? '', 10);
    if (!id || isNaN(numId) || !user) return;
    setSending(true);
    setSuccessMsg('');
    try {
      await updateCase(numId, {
        usuario_id: user.id,
        comentario: data.comentario,
        estado_nuevo: data.estado_nuevo || undefined,
        recursos_solicitados: data.recursos_solicitados || undefined,
        fecha_estimada_fin: data.fecha_estimada_fin || undefined,
      });
      const freshTimeline = await getCaseTimeline(numId);
      setTimeline(freshTimeline);
      if (data.estado_nuevo) {
        setGrupo((prev) => (prev ? { ...prev, estado_actual: data.estado_nuevo! } : prev));
      }
      reset({ comentario: '', estado_nuevo: '', recursos_solicitados: '', fecha_estimada_fin: '' });
      setSuccessMsg('Actualización registrada.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-5 bg-yeso rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-6 animate-pulse">
              <div className="h-4 bg-yeso rounded w-32 mb-3" />
              <div className="h-12 bg-yeso rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !grupo) {
    return (
      <div>
        <Link
          to="/casos"
          className="flex items-center gap-2 text-sm text-caoba hover:text-tierra mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Casos
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!grupo) return null;

  const categoriaNombre = grupo.categoria_id ? CATEGORIA_NAMES[grupo.categoria_id] : null;

  return (
    <div className="space-y-6 pb-10">
      <Link
        to="/casos"
        className="flex items-center gap-2 text-sm text-caoba hover:text-tierra transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Casos
      </Link>

      {/* ── HEADER DEL CASO ─────────────────────────────── */}
      <div className="bg-perla rounded-3xl-3 p-5 border border-arcilla">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-xl text-catedral font-mono leading-tight">
            {grupo.codigo_obra}
          </h2>
          <StatusBadge estado={grupo.estado_actual} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-arena">
          {categoriaNombre && <span className="font-semibold text-caoba">{categoriaNombre}</span>}
          <span>
            {grupo.total_reportes ?? 0} reporte{(grupo.total_reportes ?? 0) !== 1 ? 's' : ''}{' '}
            agrupado{(grupo.total_reportes ?? 0) !== 1 ? 's' : ''}
          </span>
          <span>
            Creado{' '}
            {new Date(grupo.creado_en).toLocaleDateString('es-BO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {grupo.fecha_estimada_fin && (
            <span className="flex items-center gap-1 text-caoba">
              <CalendarClock className="w-3 h-3" />
              ETA{' '}
              {new Date(grupo.fecha_estimada_fin).toLocaleDateString('es-BO', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── REPORTES AGRUPADOS ──────────────────────────── */}
      {reportes.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm text-tierra mb-3 flex items-center gap-2">
            <Images className="w-4 h-4 text-caoba" />
            Reportes agrupados ({reportes.length})
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {reportes.map((r) => {
              const imgSrc = r.url_imagen ? getImageUrl(r.url_imagen) : null;
              return (
                <button
                  key={r.id}
                  onClick={() => setDetailReporte(r)}
                  className="shrink-0 w-[120px] bg-perla rounded-3xl-2 border border-arcilla overflow-hidden hover:shadow-md active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-full h-[80px] bg-yeso flex items-center justify-center overflow-hidden">
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="w-5 h-5 text-arcilla" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-catedral font-mono">#{r.id}</p>
                    <p className="text-[10px] text-caoba truncate">
                      {CATEGORIA_NAMES[r.categoria_id] ?? 'Otro'}
                    </p>
                    <p className="text-[10px] text-arena font-mono mt-0.5">
                      {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── BITÁCORA DE ACTUALIZACIONES ─────────────────── */}
      <section>
        <h3 className="font-semibold text-sm text-tierra mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-caoba" />
          Bitácora de actualizaciones
          {timeline.length === 0 && (
            <span className="text-xs text-arena font-normal">— Sin actualizaciones aún</span>
          )}
        </h3>

        {timeline.length > 0 && (
          <div>
            {timeline.map((a, i) => {
              const fecha = new Date(a.creado_en).toLocaleString('es-BO', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                        a.estado_nuevo ? 'bg-sol-camba' : 'bg-arcilla'
                      }`}
                    />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-arcilla mt-1" />}
                  </div>
                  <div className="pb-5 min-w-0 flex-1">
                    {a.estado_nuevo && (
                      <div className="mb-1.5">
                        <StatusBadge estado={a.estado_nuevo} />
                      </div>
                    )}
                    <p className="text-sm text-tierra">{a.comentario}</p>
                    {a.url_imagen && (
                      <img
                        src={getImageUrl(a.url_imagen)}
                        alt=""
                        className="rounded-3xl-2 mt-2 max-w-full max-h-[220px] object-cover"
                      />
                    )}
                    {a.recursos_solicitados && (
                      <p className="text-xs text-caoba mt-1.5 flex items-center gap-1">
                        <Wrench className="w-3 h-3 shrink-0" />
                        {a.recursos_solicitados}
                      </p>
                    )}
                    {a.fecha_estimada_fin && (
                      <p className="text-xs text-caoba mt-0.5 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 shrink-0" />
                        Nueva ETA: {a.fecha_estimada_fin}
                      </p>
                    )}
                    {(a.lat_actualizada != null || a.lng_actualizada != null) && (
                      <p className="text-xs text-arena mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        GPS actualizado: {a.lat_actualizada?.toFixed(5)},{' '}
                        {a.lng_actualizada?.toFixed(5)}
                      </p>
                    )}
                    <p className="text-[10px] text-arena mt-1.5">
                      Mod. #{a.usuario_id} · {fecha}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── MENSAJES ESTADO ─────────────────────────────── */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── ACTUALIZAR CASO ─────────────────────────────── */}
      <section className="bg-perla rounded-3xl-3 p-5 border border-arcilla">
        <h3 className="font-semibold text-sm text-tierra mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-caoba" />
          Registrar actualización
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <textarea
              {...register('comentario')}
              placeholder="Describe la actualización del caso..."
              rows={3}
              className="bg-lienzo border border-arcilla rounded-3xl-3 px-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors resize-none"
            />
            {errors.comentario && (
              <p className="text-xs text-red-600 mt-1">{errors.comentario.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Cambiar estado
              </label>
              <select
                {...register('estado_nuevo')}
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra w-full focus:outline-none focus:border-caoba transition-colors"
              >
                <option value="">Sin cambio</option>
                {ESTADOS_VALIDOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Fecha est. finalización
              </label>
              <input
                {...register('fecha_estimada_fin')}
                type="date"
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra w-full focus:outline-none focus:border-caoba transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
              Recursos solicitados
            </label>
            <input
              {...register('recursos_solicitados')}
              placeholder="Ej: volqueta, mezcla asfáltica"
              className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-catedral text-perla font-medium text-sm px-6 py-3.5 rounded-3xl-3 shadow-md hover:bg-tierra disabled:opacity-60 transition-all min-h-[44px]"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Registrar actualización'}
          </button>
        </form>
      </section>

      {/* ── MODAL: DETALLE DE REPORTE INDIVIDUAL ────────── */}
      {detailReporte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-catedral/50 backdrop-blur-sm p-4"
          onClick={() => setDetailReporte(null)}
        >
          <div
            className="bg-perla w-full max-w-sm rounded-3xl-3 shadow-2xl border border-arcilla overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-arcilla bg-lienzo/60">
              <div className="flex items-center gap-2">
                <span className="bg-yeso text-ladrillo px-2 py-0.5 rounded-xl text-xs font-mono font-bold border border-arcilla">
                  #{detailReporte.id}
                </span>
                <span className="text-xs font-semibold text-tierra">
                  {CATEGORIA_NAMES[detailReporte.categoria_id] ?? 'Otro'}
                </span>
              </div>
              <button
                onClick={() => setDetailReporte(null)}
                className="text-arena hover:text-tierra hover:bg-yeso p-1.5 rounded-pill transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-52 bg-yeso flex items-center justify-center overflow-hidden">
              {detailReporte.url_imagen ? (
                <img
                  src={getImageUrl(detailReporte.url_imagen)}
                  alt="Evidencia"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageOff className="w-8 h-8 text-arcilla" />
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Coordenadas
                  </p>
                  <p className="font-mono text-xs text-tierra">
                    {detailReporte.lat.toFixed(5)},<br />
                    {detailReporte.lng.toFixed(5)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Device ID
                  </p>
                  <p className="font-mono text-xs text-tierra truncate">
                    {detailReporte.device_id}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5">
                  Estado
                </p>
                <StatusBadge estado={detailReporte.estado} />
              </div>
              <p className="text-[10px] text-arena">
                Registrado{' '}
                {new Date(detailReporte.creado_en).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  getGroup,
  getCaseTimeline,
  updateCase,
  type GrupoReporte,
  type Actualizacion,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import StatusBadge from '../components/StatusBadge';
import { getImageUrl } from '../lib/api';

const updateSchema = z.object({
  comentario: z.string().min(1, 'El comentario es obligatorio'),
  estado_nuevo: z.string().optional(),
  recursos_solicitados: z.string().optional(),
  fecha_estimada_fin: z.string().optional(),
});

type UpdateForm = z.infer<typeof updateSchema>;

const ESTADOS = ['Aceptado', 'ValidacionEnCampo', 'EnTrabajo', 'Finalizado'];

export default function CasoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [grupo, setGrupo] = useState<GrupoReporte | null>(null);
  const [timeline, setTimeline] = useState<Actualizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
  });

  useEffect(() => {
    const numId = parseInt(id ?? '', 10);
    if (!id || isNaN(numId)) return;
    setLoading(true);
    setError('');
    Promise.all([getGroup(numId), getCaseTimeline(numId)])
      .then(([g, t]) => {
        setGrupo(g);
        setTimeline(t);
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
      <div>
        <div className="h-6 bg-yeso rounded w-48 mb-6 animate-pulse" />
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

  return (
    <div>
      <Link
        to="/casos"
        className="flex items-center gap-2 text-sm text-caoba hover:text-tierra mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Casos
      </Link>

      <div className="bg-perla rounded-3xl-3 p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg text-catedral">{grupo.codigo_obra}</h2>
          <StatusBadge estado={grupo.estado_actual} />
        </div>
        <div className="flex items-center gap-4 text-xs text-arena">
          <span>{grupo.total_reportes ?? 0} reportes agrupados</span>
          <span>Creado {new Date(grupo.creado_en).toLocaleDateString('es-BO')}</span>
          {grupo.fecha_estimada_fin && (
            <span>
              Entrega est.: {new Date(grupo.fecha_estimada_fin).toLocaleDateString('es-BO')}
            </span>
          )}
        </div>
      </div>

      {timeline.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-sm text-tierra mb-4">Bitacora de actualizaciones</h3>
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
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${a.estado_nuevo ? 'bg-sol-camba' : 'bg-arcilla'}`}
                    />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-arcilla mt-1" />}
                  </div>
                  <div className="pb-4 min-w-0 flex-1">
                    {a.estado_nuevo && (
                      <span className="text-[10px] font-semibold text-sol-camba uppercase tracking-wide">
                        {a.estado_nuevo}
                      </span>
                    )}
                    <p className="text-sm text-tierra mt-0.5">{a.comentario}</p>
                    {a.url_imagen && (
                      <img
                        src={getImageUrl(a.url_imagen)}
                        alt=""
                        className="rounded-3xl-2 mt-2 max-w-full max-h-[260px] object-cover"
                      />
                    )}
                    {a.recursos_solicitados && (
                      <p className="text-xs text-caoba mt-1">Recursos: {a.recursos_solicitados}</p>
                    )}
                    {a.fecha_estimada_fin && (
                      <p className="text-xs text-caoba">Nueva entrega: {a.fecha_estimada_fin}</p>
                    )}
                    <p className="text-[10px] text-arena mt-1">
                      Mod. #{a.usuario_id} · {fecha}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-perla rounded-3xl-3 p-5">
        <h3 className="font-semibold text-sm text-tierra mb-4">Agregar actualizacion</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <textarea
              {...register('comentario')}
              placeholder="Describi la actualizacion..."
              rows={3}
              className="bg-lienzo border border-arcilla rounded-3xl-3 px-5 py-3.5 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors resize-none"
            />
            {errors.comentario && (
              <p className="text-xs text-red-600 mt-1">{errors.comentario.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Cambiar estado
              </label>
              <select
                {...register('estado_nuevo')}
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra w-full focus:outline-none focus:border-caoba transition-colors"
              >
                <option value="">Sin cambio</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Recursos solicitados
              </label>
              <input
                {...register('recursos_solicitados')}
                placeholder="Ej: volqueta, mezcla"
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra placeholder:text-almendra w-full focus:outline-none focus:border-caoba transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ladrillo uppercase tracking-wide mb-1">
                Fecha est. fin
              </label>
              <input
                {...register('fecha_estimada_fin')}
                type="date"
                className="bg-lienzo border border-arcilla rounded-3xl-3 px-4 py-3 text-sm text-tierra w-full focus:outline-none focus:border-caoba transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-catedral text-perla font-medium text-sm px-6 py-3.5 rounded-3xl-3 shadow-md hover:bg-tierra disabled:opacity-60 transition-all"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Registrar actualizacion'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI, getImageUrl } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import ReportTimeline from '../components/ReportTimeline';
import { CATEGORIA_NAMES } from '../lib/categories';
import { ArrowLeft, Share2, Calendar, ImageOff } from 'lucide-react';

interface GrupoDetail {
  id: number;
  codigo_obra: string;
  estado_actual: string;
  fecha_estimada_fin: string | null;
  creado_en: string;
  total_reportes: number;
}

interface ReporteItem {
  id: number;
  categoria_id: number;
  estado: string;
  url_imagen: string;
  creado_en: string;
  grupo_id: number | null;
}

interface Actualizacion {
  id: number;
  usuario_id: number;
  comentario: string;
  estado_nuevo: string | null;
  url_imagen: string | null;
  creado_en: string;
}

export default function GroupReportePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [grupo, setGrupo] = useState<GrupoDetail | null>(null);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [timeline, setTimeline] = useState<Actualizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    const id = parseInt(groupId, 10);
    Promise.all([
      fetchAPI<GrupoDetail>(`/admin/groups/${id}`),
      fetchAPI<{ data: ReporteItem[] }>(`/reportes?grupo_id=${id}&limit=50`),
      fetchAPI<Actualizacion[]>(`/admin/groups/${id}/timeline`),
    ])
      .then(([g, r, tl]) => {
        setGrupo(g);
        setReportes(r.data);
        setTimeline(tl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Caso ${grupo?.codigo_obra ?? ''} - Ojo Camba`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) return <div className="p-4 text-sm text-arena">Cargando...</div>;
  if (!grupo) return <div className="p-4 text-sm text-arena">Caso no encontrado.</div>;

  const categorias = [...new Set(reportes.map((r) => r.categoria_id))];
  const fechaCreado = new Date(grupo.creado_en).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header fijo */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-2 border-b border-arcilla bg-perla">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center shrink-0 rounded-pill"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-caoba" />
        </button>
        <div className="flex-1 min-w-0 px-1">
          <div className="flex items-center gap-2">
            <StatusBadge estado={grupo.estado_actual} />
            <span className="text-[10px] text-arena font-mono truncate">{grupo.codigo_obra}</span>
          </div>
          <p className="text-[10px] text-arena mt-0.5">
            {grupo.total_reportes} reporte{grupo.total_reportes !== 1 ? 's' : ''} · {fechaCreado}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="w-11 h-11 flex items-center justify-center shrink-0 text-caoba rounded-pill"
          aria-label="Compartir"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          {/* Categorías y ETA */}
          <div className="flex items-center gap-2 flex-wrap">
            {categorias.map((catId) => (
              <span
                key={catId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-perla rounded-pill text-xs text-tierra"
              >
                {CATEGORIA_NAMES[catId] ?? 'Otro'}
              </span>
            ))}
            {grupo.fecha_estimada_fin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sol-camba/10 rounded-pill text-xs text-sol-camba">
                <Calendar className="w-3 h-3" />
                ETA{' '}
                {new Date(grupo.fecha_estimada_fin).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </div>

          {/* Grilla de fotos */}
          <div>
            <h3 className="text-xs font-semibold text-arena uppercase tracking-wide mb-2">
              Fotos ({reportes.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {reportes.map((r) => (
                <div
                  key={r.id}
                  className="relative aspect-square rounded-3xl-2 overflow-hidden bg-yeso max-h-[300px]"
                >
                  {r.url_imagen ? (
                    <img
                      src={getImageUrl(r.url_imagen)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-6 h-6 text-arcilla" />
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5">
                    <StatusBadge estado={r.estado} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bitácora */}
          <div>
            <h3 className="text-xs font-semibold text-arena uppercase tracking-wide mb-3">
              Bitácora
            </h3>
            <ReportTimeline items={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}

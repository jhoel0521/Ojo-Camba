import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import ReportTimeline from '../components/ReportTimeline';
import { getDeviceId } from '../lib/device';
import { ArrowLeft, Share2 } from 'lucide-react';

interface ReporteDetail {
  id: number;
  estado: string;
  creado_en: string;
  url_imagen: string;
  categoria_id: number;
  grupo_id: number | null;
  h3_res_8: string;
}

export default function ReporteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState<ReporteDetail | null>(null);
  const [timeline, setTimeline] = useState<
    {
      id: number;
      usuario_id: number;
      comentario: string;
      estado_nuevo: string | null;
      url_imagen: string | null;
      creado_en: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const deviceId = getDeviceId();
    fetchAPI<ReporteDetail>(`/reportes/${id}?device_id=${deviceId}`)
      .then(async (r) => {
        setReporte(r);
        if (r.grupo_id) {
          const tl = await fetchAPI<
            {
              id: number;
              usuario_id: number;
              comentario: string;
              estado_nuevo: string | null;
              url_imagen: string | null;
              creado_en: string;
            }[]
          >(`/admin/groups/${r.grupo_id}/timeline`);
          setTimeline(tl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Reporte #${id} - Ojo Camba`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) return <div className="p-4 text-sm text-arena">Cargando...</div>;
  if (!reporte) return <div className="p-4 text-sm text-arena">Reporte no encontrado.</div>;

  const fecha = new Date(reporte.creado_en).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-arcilla bg-perla">
        <button
          onClick={() => navigate(-1)}
          className="w-7 h-7 flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-caoba" />
        </button>
        <h2 className="font-semibold text-sm text-tierra flex-1 min-w-0 truncate">Reporte #{id}</h2>
        <button
          onClick={handleShare}
          className="w-7 h-7 flex items-center justify-center shrink-0 text-caoba"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <img src={reporte.url_imagen} alt="" className="w-full" />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <StatusBadge estado={reporte.estado} />
          <span className="text-xs text-arena">{fecha}</span>
        </div>

        {reporte.grupo_id && (
          <div className="bg-perla rounded-3xl-2 p-3 text-center">
            <p className="text-xs text-caoba">Este reporte fue agrupado en un Caso de Obra</p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-arena uppercase tracking-wide mb-2">
            Bitacora
          </h3>
          <ReportTimeline items={timeline} />
        </div>
      </div>
    </div>
  );
}

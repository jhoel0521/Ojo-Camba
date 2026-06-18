import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../lib/api';
import ReporteCard from '../components/ReporteCard';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface ReporteItem {
  id: number; categoria_id: number; estado: string;
  url_imagen: string; creado_en: string;
}

export default function HexagonoPage() {
  const { resolution, h3 } = useParams<{ resolution: string; h3: string }>();
  const navigate = useNavigate();
  const filters = useAppStore((s) => s.filters);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolution || !h3) return;
    const params = new URLSearchParams({
      h3_cell: h3,
      h3_resolution: resolution,
    });
    fetchAPI<{ data: ReporteItem[]; total: number }>(`/reportes?${params}`)
      .then((r) => setReportes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resolution, h3, filters]);

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-arcilla bg-perla">
        <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4 text-caoba" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm text-tierra truncate">
            Celda H3 res {resolution}
          </h2>
          <p className="text-[10px] text-arena font-mono truncate">{h3}</p>
        </div>
        {!loading && (
          <span className="text-xs text-arena shrink-0">{reportes.length} reporte{reportes.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading && <p className="text-sm text-arena">Cargando...</p>}
        {!loading && reportes.length === 0 && (
          <div className="bg-perla rounded-3xl-3 p-8 text-center">
            <p className="text-sm text-caoba">Sin reportes en esta celda.</p>
          </div>
        )}
        {reportes.map((r) => <ReporteCard key={r.id} {...r} />)}
      </div>
    </div>
  );
}

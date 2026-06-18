import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchAPI } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { CATEGORIA_NAMES } from '../lib/categories';
import { CAT_COLORS } from '../lib/catColors';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface GroupCellSummary {
  id: number;
  estado_actual: string;
  categoria_id: number | null;
  creado_en: string;
  total_reportes: string;
  preview_imagen: string | null;
}

export default function HexagonoPage() {
  const { resolution, h3 } = useParams<{ resolution: string; h3: string }>();
  const navigate = useNavigate();
  const filters = useAppStore((s) => s.filters);
  const [grupos, setGrupos] = useState<GroupCellSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolution || !h3) return;
    setLoading(true);
    const params = new URLSearchParams({
      h3_cell: h3,
      h3_resolution: resolution,
      solo_activos: String(filters.soloActivos),
    });
    fetchAPI<GroupCellSummary[]>(`/admin/groups/by-cell?${params}`)
      .then(setGrupos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resolution, h3, filters]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-1 px-2 py-2 border-b border-arcilla bg-perla">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex items-center justify-center shrink-0 rounded-pill"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-caoba" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <h2 className="font-semibold text-sm text-tierra">Reportes en la zona</h2>
        </div>
        {!loading && (
          <span className="text-xs text-arena shrink-0 pr-2">
            {grupos.length} caso{grupos.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-sm text-arena">Cargando...</p>}
        {!loading && grupos.length === 0 && (
          <div className="bg-perla rounded-3xl-2 p-8 text-center">
            <p className="text-sm text-caoba">Sin casos en esta zona.</p>
            <p className="text-xs text-arena mt-1">
              Los reportes aceptados aparecer&aacute;n aquí.
            </p>
          </div>
        )}
        {grupos.map((g) => {
          const total = parseInt(g.total_reportes, 10);
          const catId = g.categoria_id;
          const fecha = new Date(g.creado_en).toLocaleDateString('es-BO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          return (
            <Link
              key={g.id}
              to={`/group-reporte/${g.id}`}
              className="bg-perla rounded-3xl-2 overflow-hidden flex items-center gap-3 p-3 active:scale-[0.98] transition-all"
            >
              <div className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-yeso flex items-center justify-center">
                {g.preview_imagen ? (
                  <img src={g.preview_imagen} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-5 h-5 text-arcilla" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <StatusBadge estado={g.estado_actual} />
                  {catId && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CAT_COLORS[catId] ?? '#888' }}
                    />
                  )}
                </div>
                <p className="text-xs text-tierra font-medium">
                  {catId ? (CATEGORIA_NAMES[catId] ?? 'Otro') : 'Sin categoría'}
                </p>
                <p className="text-[10px] text-arena mt-0.5">
                  {total} reporte{total !== 1 ? 's' : ''} · {fecha}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { MapPin, FolderOpen, Plus, Eye, X, Camera, Activity } from 'lucide-react';
import { getImageUrl } from '../lib/api';
import { CATEGORIA_NAMES } from '../lib/categories';
import {
  getCaseTimeline,
  listReportesByGrupo,
  type PendingReport,
  type GrupoReporte,
  type Actualizacion,
} from '../lib/adminApi';

export interface NearbyReport extends PendingReport {
  distanciaM: number;
}

interface NearbyReportsListProps {
  nearby: NearbyReport[];
  nearbyObras: GrupoReporte[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onOpenDetail: (r: NearbyReport) => void;
  onAddToObra: (grupoId: number) => void;
}

export default function NearbyReportsList({
  nearby,
  nearbyObras,
  selectedIds,
  onToggle,
  onOpenDetail,
  onAddToObra,
}: NearbyReportsListProps) {
  const [detailObra, setDetailObra] = useState<GrupoReporte | null>(null);
  const [obraTimeline, setObraTimeline] = useState<Actualizacion[]>([]);
  const [obraReportes, setObraReportes] = useState<PendingReport[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openObraDetail = async (obra: GrupoReporte) => {
    setDetailObra(obra);
    setObraTimeline([]);
    setObraReportes([]);
    setLoadingDetail(true);
    try {
      const [timeline, reportes] = await Promise.all([
        getCaseTimeline(obra.id),
        listReportesByGrupo(obra.id, 6),
      ]);
      setObraTimeline(timeline);
      setObraReportes(reportes);
    } catch {
      // silencioso — el drawer ya muestra lo que tiene
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDrawer = () => {
    setDetailObra(null);
    setObraTimeline([]);
    setObraReportes([]);
  };

  const hasContent = nearbyObras.length > 0 || nearby.length > 0;

  return (
    <>
      {/* ── Col 3 scroll content ── */}
      {!hasContent ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-arena text-center italic">
            No hay obras activas ni reportes pendientes en este hexágono H3.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* ── Obras activas cercanas ── */}
          <div>
            <p className="text-[10px] font-bold text-caoba uppercase tracking-wider mb-2 flex items-center gap-1">
              <FolderOpen className="w-3 h-3" /> Obras activas cercanas
            </p>
            {nearbyObras.length === 0 ? (
              <p className="text-[10px] text-arena italic px-1">Sin obras en este hexágono.</p>
            ) : (
              <div className="space-y-2">
                {nearbyObras.map((obra) => (
                  <div
                    key={obra.id}
                    className="bg-perla rounded-3xl-2 p-3 border border-arcilla space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-tierra font-mono">
                          {obra.codigo_obra}
                        </p>
                        <p className="text-[10px] text-arena mt-0.5">
                          {obra.categoria_id
                            ? (CATEGORIA_NAMES[obra.categoria_id] ?? 'Otro')
                            : 'Sin categoría'}
                          {' · '}
                          {obra.estado_actual}
                        </p>
                      </div>
                      <button
                        onClick={() => openObraDetail(obra)}
                        title="Ver expediente de la obra"
                        className="text-arena hover:text-caoba hover:bg-yeso p-1.5 rounded-pill transition-colors shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => onAddToObra(obra.id)}
                      data-testid={`btn-add-to-obra-${obra.id}`}
                      className="w-full flex items-center justify-center gap-1.5 bg-caoba/10 hover:bg-caoba/20 text-caoba font-semibold text-[11px] min-h-[44px] px-3 rounded-2xl border border-caoba/30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir a esta obra
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Reportes pendientes cercanos ── */}
          <div>
            <p className="text-[10px] font-bold text-caoba uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Reportes pendientes ≤ 100 m
            </p>
            {nearby.length === 0 ? (
              <p className="text-[10px] text-arena italic px-1">
                Sin reportes pendientes cercanos.
              </p>
            ) : (
              <div className="space-y-2">
                {nearby.map((r) => {
                  const checked = selectedIds.has(r.id);
                  const distLabel =
                    r.distanciaM < 1000
                      ? `${Math.round(r.distanciaM)} m`
                      : `${(r.distanciaM / 1000).toFixed(1)} km`;

                  return (
                    <div
                      key={r.id}
                      data-testid={`nearby-card-${r.id}`}
                      className={`flex items-center gap-2.5 bg-perla rounded-3xl-2 p-2.5 border transition-all ${
                        checked ? 'border-caoba ring-1 ring-caoba' : 'border-arcilla'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(r.id)}
                        className="w-4 h-4 rounded accent-catedral shrink-0"
                        aria-label={`Incluir reporte #${r.id} en el grupo`}
                      />
                      <button
                        onClick={() => onOpenDetail(r)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={getImageUrl(r.url_imagen)}
                          alt=""
                          className="w-10 h-10 object-cover rounded-xl shrink-0 bg-yeso"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-tierra truncate">
                            {CATEGORIA_NAMES[r.categoria_id] || 'Otro'}
                          </p>
                          <p className="text-[10px] text-arena">#{r.id}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-caoba bg-yeso px-2 py-0.5 rounded-pill border border-arcilla shrink-0">
                          <MapPin className="w-2.5 h-2.5" />
                          {distLabel}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Drawer: Expediente de obra ── */}
      {detailObra && (
        <div
          className="fixed inset-0 z-[60] flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDrawer();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-catedral/50 backdrop-blur-sm" onClick={closeDrawer} />

          {/* Panel drawer */}
          <div className="relative w-full max-w-[520px] h-full bg-perla border-l border-arcilla flex flex-col shadow-2xl">
            {/* Header sticky */}
            <div className="shrink-0 bg-lienzo/80 backdrop-blur-md border-b border-arcilla px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderOpen className="w-4 h-4 text-caoba shrink-0" />
                  <p className="text-sm font-bold text-tierra font-mono truncate">
                    {detailObra.codigo_obra}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="flex items-center gap-1.5 text-arena hover:text-tierra hover:bg-yeso px-3 py-1.5 rounded-pill transition-colors text-xs font-semibold border border-transparent hover:border-arcilla shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Cerrar
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-yeso text-tierra text-[10px] font-semibold px-2.5 py-1 rounded-pill border border-arcilla">
                  {detailObra.categoria_id
                    ? (CATEGORIA_NAMES[detailObra.categoria_id] ?? 'Otro')
                    : 'Sin categoría'}
                </span>
                <span className="bg-caoba/10 text-caoba text-[10px] font-semibold px-2.5 py-1 rounded-pill border border-caoba/30">
                  {detailObra.estado_actual}
                </span>
                {detailObra.total_reportes !== undefined && (
                  <span className="bg-yeso text-arena text-[10px] px-2.5 py-1 rounded-pill border border-arcilla">
                    {detailObra.total_reportes} reporte{detailObra.total_reportes !== 1 ? 's' : ''}
                  </span>
                )}
                {detailObra.creado_en && (
                  <span className="text-[10px] text-arena self-center">
                    {new Date(detailObra.creado_en).toLocaleDateString('es-BO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* ── Sección: Evidencias ── */}
              <div>
                <h3 className="text-[11px] font-bold text-caoba uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Evidencias en esta obra
                </h3>

                {loadingDetail ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-yeso rounded-3xl-2 animate-pulse border border-arcilla"
                      />
                    ))}
                  </div>
                ) : obraReportes.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {obraReportes.map((r) => (
                      <div
                        key={r.id}
                        className="group relative aspect-square rounded-3xl-2 overflow-hidden border border-arcilla"
                      >
                        <img
                          src={getImageUrl(r.url_imagen)}
                          alt={`Reporte #${r.id}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-catedral/60 backdrop-blur-sm py-1 text-center">
                          <span className="text-perla text-[9px] font-mono">#{r.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : detailObra.preview_imagen ? (
                  <div className="rounded-3xl-2 overflow-hidden border border-arcilla">
                    <img
                      src={getImageUrl(detailObra.preview_imagen)}
                      alt="Preview de la obra"
                      className="w-full h-40 object-cover bg-yeso"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-arena italic">Sin evidencias disponibles.</p>
                )}
              </div>

              {/* ── Sección: Timeline ── */}
              <div>
                <h3 className="text-[11px] font-bold text-caoba uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Actualizaciones
                </h3>

                {loadingDetail ? (
                  <div className="space-y-3 ml-3 pl-4 border-l-2 border-arcilla">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-yeso rounded-3xl-2 p-3 border border-arcilla animate-pulse h-14"
                      />
                    ))}
                  </div>
                ) : obraTimeline.length === 0 ? (
                  <p className="text-[10px] text-arena italic px-1">
                    Sin actualizaciones registradas aún.
                  </p>
                ) : (
                  <div className="relative ml-3 border-l-2 border-arcilla space-y-4">
                    {obraTimeline.map((act, i) => (
                      <div key={act.id} className="relative pl-5">
                        <span
                          className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-perla shadow-sm bg-caoba ${
                            i === obraTimeline.length - 1 ? 'ring-2 ring-caoba/30' : ''
                          }`}
                        />
                        <div className="bg-lienzo/60 rounded-3xl-2 border border-arcilla p-3">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="text-[10px] font-bold text-tierra">
                              Usuario #{act.usuario_id}
                            </span>
                            <span className="text-[9px] text-arena shrink-0">
                              {new Date(act.creado_en).toLocaleDateString('es-BO', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-tierra/80 leading-snug">{act.comentario}</p>
                          {act.estado_nuevo && (
                            <span className="inline-block mt-1.5 text-[9px] font-semibold bg-caoba/10 text-caoba px-2 py-0.5 rounded-pill border border-caoba/20">
                              → {act.estado_nuevo}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer sticky — CTA principal (Fitts: ≥44px) */}
            <div className="shrink-0 bg-lienzo/80 backdrop-blur-md border-t border-arcilla p-4">
              <button
                onClick={() => {
                  closeDrawer();
                  onAddToObra(detailObra.id);
                }}
                className="w-full flex items-center justify-center gap-2 bg-caoba text-perla font-bold text-sm min-h-[48px] px-5 rounded-3xl-3 hover:brightness-110 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Añadir este reporte a esta obra
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

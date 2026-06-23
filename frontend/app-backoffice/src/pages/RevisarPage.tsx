import { useEffect, useState, useCallback } from 'react';
import {
  List,
  X,
  CheckCircle,
  XCircle,
  Ban,
  MapPin,
  Smartphone,
  Hexagon,
  Camera,
  Edit3,
  AlertTriangle,
  Map as MapIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  listPending,
  acceptReport,
  rejectReport as rejectReportApi,
  createGroup,
  banDevice,
  type PendingReport,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import { getImageUrl } from '../lib/api';
import { CATEGORIA_NAMES, CATEGORIA_IDS } from '../lib/categories';
import PendingGroupCard from '../components/PendingGroupCard';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

interface GroupedReports {
  h3Cell: string;
  reportes: PendingReport[];
}

export default function RevisarPage() {
  const user = useAuthStore((s) => s.user);
  const [reportes, setReportes] = useState<PendingReport[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Slide-over de detalle
  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(null);
  const [editedCategoriaId, setEditedCategoriaId] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPending(page);
      setReportes(res.data);
      setTotal(res.total);
      setSelectedIds(new Set());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeReport = (id: number) => {
    setReportes((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const handleAccept = (id: number, categoriaId?: number) => {
    if (!user) return;
    setConfirmModal({
      title: 'Aceptar reporte',
      message: `Al aceptar el reporte #${id}, se creara automaticamente un Caso de Obra.`,
      action: async () => {
        await acceptReport(id, user.id, categoriaId);
        removeReport(id);
      },
    });
  };

  const handleReject = (id: number) => {
    setConfirmModal({
      title: 'Rechazar reporte',
      message: `El reporte #${id} sera rechazado permanentemente.`,
      action: async () => {
        await rejectReportApi(id);
        removeReport(id);
      },
    });
  };

  const handleGroupSelected = () => {
    if (!user || selectedIds.size < 2) return;
    const ids = Array.from(selectedIds);
    setConfirmModal({
      title: 'Crear Caso de Obra',
      message: `Se agruparan ${ids.length} reportes en un solo Caso de Obra con codigo unico.`,
      action: async () => {
        await createGroup(ids, user.id);
        setReportes((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setTotal((t) => t - ids.length);
        setSelectedIds(new Set());
        if (selectedReport && selectedIds.has(selectedReport.id)) setSelectedReport(null);
      },
    });
  };

  const handleRejectSelected = () => {
    const ids = Array.from(selectedIds);
    setConfirmModal({
      title: 'Rechazar seleccionados',
      message: `Se rechazaran ${ids.length} reportes permanentemente.`,
      action: async () => {
        await Promise.all(ids.map((id) => rejectReportApi(id)));
        setReportes((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setTotal((t) => t - ids.length);
        setSelectedIds(new Set());
        if (selectedReport && selectedIds.has(selectedReport.id)) setSelectedReport(null);
      },
    });
  };

  const handleBanDevice = (report: PendingReport) => {
    setConfirmModal({
      title: 'Banear dispositivo',
      message: `¿Marcar "${report.device_id.slice(0, 16)}..." como spam y bloquear este dispositivo?`,
      action: async () => {
        await banDevice(report.device_id, 'Marcado como spam por moderador');
        await rejectReportApi(report.id);
        removeReport(report.id);
      },
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDetail = (report: PendingReport) => {
    setSelectedReport(report);
    setEditedCategoriaId(report.categoria_id);
  };

  const getNearbyReports = (report: PendingReport) =>
    reportes.filter((r) => r.h3_res_11 === report.h3_res_11 && r.id !== report.id);

  const groups: GroupedReports[] = (() => {
    const map = new Map<string, PendingReport[]>();
    reportes.forEach((r) => {
      const cell = r.h3_res_11;
      if (!map.has(cell)) map.set(cell, []);
      map.get(cell)!.push(r);
    });
    return Array.from(map.entries())
      .map(([h3Cell, reportes]) => ({ h3Cell, reportes }))
      .sort((a, b) => b.reportes.length - a.reportes.length);
  })();

  // Posiciones simuladas de marcadores en el mapa
  const markerPositions = reportes.map((r, idx) => ({
    id: r.id,
    top: `${25 + (idx % 4) * 16}%`,
    left: `${28 + (idx % 5) * 16}%`,
  }));

  return (
    <div className="-m-6 h-full overflow-hidden flex relative">

      {/* ── PANEL IZQUIERDO: Bandeja de entrada ── */}
      <section className="w-[420px] shrink-0 bg-perla border-r border-arcilla flex flex-col shadow-[2px_0_12px_rgba(27,20,16,0.06)]">
        <div className="px-4 py-3.5 border-b border-arcilla flex items-center justify-between bg-lienzo/60">
          <h2 className="font-semibold text-tierra text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-caoba" />
            Bandeja de Entrada
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-yeso text-tierra text-xs px-2.5 py-1 rounded-pill font-semibold border border-arcilla">
              {total} Pendientes
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-[11px] font-medium text-caoba hover:text-tierra disabled:opacity-40 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && reportes.length === 0 && (
            <div className="space-y-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-lienzo rounded-3xl-3 p-4 animate-pulse border border-arcilla">
                  <div className="h-3.5 bg-yeso rounded w-28 mb-2.5" />
                  <div className="h-10 bg-yeso rounded-2xl" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-yeso border border-arcilla rounded-3xl-2 px-4 py-3 mt-1">
              <p className="text-xs text-ladrillo">{error}</p>
            </div>
          )}

          {!loading && !error && groups.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle className="w-8 h-8 text-arcilla mx-auto mb-2" />
              <p className="text-sm text-arena">No hay reportes pendientes.</p>
            </div>
          )}

          {groups.map((g) => (
            <PendingGroupCard
              key={g.h3Cell}
              h3Cell={g.h3Cell}
              reportes={g.reportes}
              selectedIds={selectedIds}
              selectedReportId={selectedReport?.id}
              onToggleSelect={toggleSelect}
              onSelectAll={() => {
                const allSelected = g.reportes.every((r) => selectedIds.has(r.id));
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  g.reportes.forEach((r) => {
                    if (allSelected) next.delete(r.id);
                    else next.add(r.id);
                  });
                  return next;
                });
              }}
              onGroupSelected={handleGroupSelected}
              onRejectSelected={handleRejectSelected}
              onOpenDetail={openDetail}
              loading={actionLoading}
            />
          ))}
        </div>

        <div className="border-t border-arcilla px-3 py-2">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </section>

      {/* ── PANEL DERECHO: Mapa DSS ── */}
      <section className="flex-1 bg-catedral relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(to right, #5e483a 1px, transparent 1px), linear-gradient(to bottom, #5e483a 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-sol-camba rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-ladrillo rounded-full mix-blend-screen filter blur-[60px] opacity-30" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-caoba rounded-full mix-blend-screen filter blur-[100px] opacity-20" />

        {markerPositions.map((pos) => {
          const isSelected = selectedReport?.id === pos.id;
          return (
            <div
              key={`map-${pos.id}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              style={{ top: pos.top, left: pos.left }}
            >
              <div
                className={`rounded-full border-2 border-perla shadow-lg transition-all duration-300 ${
                  isSelected
                    ? 'w-5 h-5 bg-sol-camba scale-125 animate-pulse'
                    : 'w-3.5 h-3.5 bg-ladrillo'
                }`}
              />
              {isSelected && (
                <div className="mt-1.5 bg-perla px-2 py-0.5 rounded-xl shadow text-[10px] font-bold text-catedral flex items-center gap-1">
                  <Hexagon className="w-2.5 h-2.5 text-sol-camba" />
                  #{pos.id}
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute bottom-5 right-5 bg-catedral/80 backdrop-blur-md p-4 rounded-3xl-2 border border-ladrillo/40 text-perla shadow-2xl">
          <h4 className="text-xs font-bold flex items-center gap-1.5 mb-1.5 text-sol-camba">
            <MapIcon className="w-3.5 h-3.5" /> DSS Espacial Activo
          </h4>
          <p className="text-[10px] text-arena leading-relaxed max-w-[180px]">
            Concentración de reportes por índice H3. Selecciona un reporte para ver su ubicación.
          </p>
        </div>

        {reportes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-arena text-sm">Sin reportes activos en el mapa.</p>
          </div>
        )}
      </section>

      {/* ── SLIDE-OVER: Detalle del reporte ── */}
      {selectedReport && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-catedral/50 backdrop-blur-sm p-4">
          <div className="bg-perla w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl-3 shadow-2xl flex flex-col">

            <div className="flex justify-between items-center px-6 py-4 border-b border-arcilla sticky top-0 bg-perla z-10 rounded-t-3xl-3">
              <div className="flex items-center gap-3">
                <span className="bg-yeso text-ladrillo px-3 py-1 rounded-xl text-xs font-mono font-bold border border-arcilla">
                  #{selectedReport.id}
                </span>
                <h2 className="text-base font-bold text-tierra">Inspección del Reporte</h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-arena hover:text-tierra hover:bg-yeso p-2 rounded-pill transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row p-6 gap-6 flex-1">

              {/* Columna izquierda: Evidencia + Metadatos */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="rounded-3xl-2 overflow-hidden border border-arcilla relative group">
                  <div className="absolute top-2.5 left-2.5 bg-catedral/70 backdrop-blur-md text-perla text-[10px] px-2 py-1 rounded-xl flex items-center gap-1 z-10">
                    <Camera className="w-3 h-3" /> S3 Storage
                  </div>
                  <img
                    src={getImageUrl(selectedReport.url_imagen)}
                    alt="Evidencia"
                    className="w-full h-60 object-cover transform group-hover:scale-105 transition-transform duration-500 bg-yeso"
                  />
                </div>

                <div className="bg-lienzo rounded-3xl-2 p-4 border border-arcilla space-y-3">
                  <div className="bg-perla p-3 rounded-3xl-2 border border-arcilla">
                    <label className="text-[10px] font-bold text-sol-camba uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Corregir Categoría
                    </label>
                    <select
                      value={editedCategoriaId}
                      onChange={(e) => setEditedCategoriaId(Number(e.target.value))}
                      className="w-full mt-1 p-2 border border-arcilla rounded-2xl bg-lienzo text-tierra font-semibold text-sm focus:outline-none focus:border-caoba transition-colors"
                    >
                      {Object.entries(CATEGORIA_IDS).map(([name, id]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {selectedReport.categoria_id !== editedCategoriaId && (
                      <p className="text-[10px] text-caoba mt-1.5">
                        El ciudadano reportó: "{CATEGORIA_NAMES[selectedReport.categoria_id] ?? 'Otro'}"
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <h3 className="text-[10px] font-bold text-arena uppercase tracking-wide mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Coordenadas
                      </h3>
                      <p className="font-mono text-xs text-tierra">
                        {Number(selectedReport.lat).toFixed(5)}, {Number(selectedReport.lng).toFixed(5)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-arena uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Device ID
                      </h3>
                      <p className="font-mono text-xs text-tierra truncate">{selectedReport.device_id}</p>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-arcilla">
                    <h3 className="text-[10px] font-bold text-arena uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Hexagon className="w-3 h-3" /> Celda H3
                    </h3>
                    <p className="font-mono text-xs text-caoba break-all">{selectedReport.h3_res_11}</p>
                  </div>
                </div>
              </div>

              {/* Columna derecha: H3 Intelligence + Acciones */}
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                {(() => {
                  const nearby = getNearbyReports(selectedReport);
                  return nearby.length > 0 ? (
                    <div className="bg-yeso border border-arcilla rounded-3xl-2 p-4">
                      <p className="text-xs font-bold text-ladrillo mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-sol-camba" />
                        {nearby.length} Reporte{nearby.length > 1 ? 's' : ''} más en esta zona H3
                      </p>
                      <p className="text-[10px] text-caoba mb-3 leading-snug">
                        Considera agrupar reportes de la misma zona para crear un Caso de Obra.
                      </p>
                      <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {nearby.map((r) => (
                          <li
                            key={r.id}
                            className="flex justify-between items-center bg-perla rounded-2xl px-3 py-1.5 border border-arcilla"
                          >
                            <span className="font-mono text-[10px] text-caoba">#{r.id}</span>
                            <span className="text-[10px] font-semibold text-tierra bg-yeso px-2 py-0.5 rounded-pill border border-arcilla">
                              {CATEGORIA_NAMES[r.categoria_id] ?? 'Otro'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-yeso border border-arcilla rounded-3xl-2 p-4">
                      <p className="text-xs text-arena italic text-center py-2">
                        No hay otros reportes en este hexágono H3.
                      </p>
                    </div>
                  );
                })()}

                {/* Panel de acciones */}
                <div className="bg-perla rounded-3xl-2 border border-arcilla p-5 mt-auto space-y-3">
                  <button
                    onClick={() => handleAccept(selectedReport.id, editedCategoriaId)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-sol-camba text-perla font-bold text-sm min-h-11 px-5 rounded-3xl-3 hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aceptar reporte
                  </button>

                  <button
                    onClick={() => handleReject(selectedReport.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-yeso text-ladrillo font-semibold text-sm min-h-11 px-5 rounded-3xl-3 border border-arcilla hover:bg-arcilla disabled:opacity-50 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar reporte
                  </button>

                  <button
                    onClick={() => handleBanDevice(selectedReport)}
                    className="w-full flex items-center justify-center gap-1.5 text-arena hover:text-ladrillo hover:bg-yeso min-h-9 px-5 rounded-3xl-3 text-xs font-medium transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Marcar como spam / Banear dispositivo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        loading={actionLoading}
        onConfirm={async () => {
          if (!confirmModal) return;
          setActionLoading(true);
          try {
            await confirmModal.action();
          } catch (err) {
            setError(friendlyError(err));
          } finally {
            setActionLoading(false);
            setConfirmModal(null);
          }
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  List,
  CheckCircle,
  XCircle,
  Ban,
  MapPin,
  Smartphone,
  Hexagon,
  Camera,
  Edit3,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Inbox,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import {
  listPending,
  listNearbyGroups,
  acceptReport,
  rejectReport as rejectReportApi,
  createGroup,
  banDevice,
  type PendingReport,
  type GrupoReporte,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
import { getImageUrl } from '../lib/api';
import { CATEGORIA_NAMES, CATEGORIA_IDS } from '../lib/categories';
import PendingReportCard from '../components/PendingReportCard';
import NearbyReportsList, { type NearbyReport } from '../components/NearbyReportsList';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RevisarPage() {
  const user = useAuthStore((s) => s.user);
  const [reportes, setReportes] = useState<PendingReport[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedReport, setSelectedReport] = useState<PendingReport | null>(null);
  const [editedCategoriaId, setEditedCategoriaId] = useState<number>(0);
  const [nearbySelected, setNearbySelected] = useState<Set<number>>(new Set());
  const [nearbyObras, setNearbyObras] = useState<GrupoReporte[]>([]);

  // Modal de detalle de un reporte cercano
  const [nearbyDetailReport, setNearbyDetailReport] = useState<NearbyReport | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPending(page);
      setReportes(res.data);
      setTotal(res.total);
      setSelectedReport(null);
      setNearbySelected(new Set());
      setNearbyObras([]);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeReports = (ids: number[]) => {
    setReportes((prev) => prev.filter((r) => !ids.includes(r.id)));
    setTotal((t) => t - ids.length);
    if (selectedReport && ids.includes(selectedReport.id)) {
      setSelectedReport(null);
      setNearbySelected(new Set());
      setNearbyObras([]);
    }
    setNearbySelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const openDetail = async (report: PendingReport) => {
    setSelectedReport(report);
    setEditedCategoriaId(report.categoria_id);
    setNearbySelected(new Set());
    setNearbyObras([]);
    try {
      const obras = await listNearbyGroups(report.h3_res_11);
      setNearbyObras(obras);
    } catch {
      // obras son contexto opcional, no bloqueamos si falla
    }
  };

  const getNearby = (report: PendingReport): NearbyReport[] =>
    reportes
      .filter((r) => r.id !== report.id)
      .map((r) => ({ ...r, distanciaM: haversineM(report.lat, report.lng, r.lat, r.lng) }))
      .filter((r) => r.distanciaM <= 100)
      .sort((a, b) => a.distanciaM - b.distanciaM);

  const handleAccept = (id: number, categoriaId?: number) => {
    if (!user) return;
    setConfirmModal({
      title: 'Aceptar reporte',
      message: `Al aceptar el reporte #${id} se creará automáticamente un Caso de Obra individual.`,
      action: async () => {
        await acceptReport(id, user.id, categoriaId);
        removeReports([id]);
      },
    });
  };

  const handleReject = (id: number) => {
    setConfirmModal({
      title: 'Rechazar reporte',
      message: `El reporte #${id} será rechazado permanentemente.`,
      action: async () => {
        await rejectReportApi(id);
        removeReports([id]);
      },
    });
  };

  const handleGroupWithNearby = () => {
    if (!user || !selectedReport) return;
    const ids = [selectedReport.id, ...Array.from(nearbySelected)];
    setConfirmModal({
      title: 'Crear Caso de Obra',
      message: `Se agruparán ${ids.length} reportes en un Caso de Obra con código único.`,
      action: async () => {
        await createGroup(ids, user.id);
        removeReports(ids);
      },
    });
  };

  const handleAddToObra = (grupoId: number) => {
    if (!user || !selectedReport) return;
    const obra = nearbyObras.find((o) => o.id === grupoId);
    setConfirmModal({
      title: 'Añadir a obra existente',
      message: `El reporte #${selectedReport.id} se añadirá a ${obra?.codigo_obra ?? `obra #${grupoId}`}.`,
      action: async () => {
        await acceptReport(selectedReport.id, user.id, editedCategoriaId, grupoId);
        removeReports([selectedReport.id]);
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
        removeReports([report.id]);
      },
    });
  };

  const toggleNearby = (id: number) => {
    setNearbySelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nearbyReports = selectedReport ? getNearby(selectedReport) : [];

  return (
    <div className="-m-6 h-full overflow-hidden flex">

      {/* ── COL 1: Bandeja de entrada ── */}
      <section className="w-[300px] shrink-0 bg-perla border-r border-arcilla flex flex-col shadow-[2px_0_8px_rgba(27,20,16,0.05)]">
        <div className="px-4 py-3 border-b border-arcilla flex items-center justify-between bg-lienzo/60">
          <h2 className="font-semibold text-tierra text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-caoba" />
            Bandeja
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-yeso text-tierra text-xs px-2.5 py-1 rounded-pill font-semibold border border-arcilla">
              {total} pendientes
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              title="Actualizar"
              data-testid="btn-actualizar"
              className="text-caoba hover:text-tierra disabled:opacity-40 transition-colors p-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {loading && reportes.length === 0 && (
            <div className="space-y-1.5 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-lienzo rounded-3xl-2 p-3 animate-pulse border border-arcilla h-20" />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-yeso border border-arcilla rounded-3xl-2 px-4 py-3 mt-1">
              <p className="text-xs text-ladrillo">{error}</p>
            </div>
          )}

          {!loading && !error && reportes.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle className="w-8 h-8 text-arcilla mx-auto mb-2" />
              <p className="text-sm text-arena">No hay reportes pendientes.</p>
            </div>
          )}

          {reportes.map((r) => (
            <div
              key={r.id}
              onClick={() => openDetail(r)}
              className={`rounded-3xl-2 transition-all ${
                selectedReport?.id === r.id ? 'ring-2 ring-caoba ring-offset-1' : ''
              }`}
            >
              <PendingReportCard
                id={r.id}
                categoria_id={r.categoria_id}
                url_imagen={r.url_imagen}
                device_id={r.device_id}
                creado_en={r.creado_en}
                selected={selectedReport?.id === r.id}
                onSelect={() => openDetail(r)}
                loading={actionLoading}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-arcilla px-3 py-2">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </section>

      {/* ── COL 2: Detalle del reporte ── */}
      <section className="flex-1 bg-lienzo/40 border-r border-arcilla flex flex-col overflow-y-auto">
        {!selectedReport ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <Inbox className="w-10 h-10 text-arcilla" />
            <p className="text-sm text-arena max-w-[180px] leading-relaxed">
              Selecciona un reporte de la bandeja para inspeccionarlo.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-yeso text-ladrillo px-3 py-1 rounded-xl text-xs font-mono font-bold border border-arcilla">
                #{selectedReport.id}
              </span>
              <h2 className="text-base font-bold text-tierra">Inspección del Reporte</h2>
            </div>

            <div className="rounded-3xl-2 overflow-hidden border border-arcilla relative group">
              <div className="absolute top-2.5 left-2.5 bg-catedral/70 backdrop-blur-md text-perla text-[10px] px-2 py-1 rounded-xl flex items-center gap-1 z-10">
                <Camera className="w-3 h-3" /> Evidencia
              </div>
              <img
                src={getImageUrl(selectedReport.url_imagen)}
                alt="Evidencia"
                className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-500 bg-yeso"
              />
            </div>

            <div className="bg-perla rounded-3xl-2 p-4 border border-arcilla space-y-3">
              <div>
                <label className="text-[10px] font-bold text-sol-camba uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Categoría
                </label>
                <select
                  value={editedCategoriaId}
                  onChange={(e) => setEditedCategoriaId(Number(e.target.value))}
                  className="w-full mt-1 p-2 border border-arcilla rounded-2xl bg-lienzo text-tierra font-semibold text-sm focus:outline-none focus:border-caoba transition-colors"
                >
                  {Object.entries(CATEGORIA_IDS).map(([name, id]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                {selectedReport.categoria_id !== editedCategoriaId && (
                  <p className="text-[10px] text-caoba mt-1.5">
                    Ciudadano reportó: "{CATEGORIA_NAMES[selectedReport.categoria_id] ?? 'Otro'}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-arcilla">
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

            {nearbySelected.size > 0 && (
              <div className="bg-yeso border border-caoba/40 rounded-3xl-2 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-sol-camba shrink-0" />
                <p className="text-xs text-tierra">
                  <span className="font-bold">{nearbySelected.size}</span> reporte{nearbySelected.size > 1 ? 's' : ''} cercano{nearbySelected.size > 1 ? 's' : ''} marcado{nearbySelected.size > 1 ? 's' : ''} para agrupar.
                </p>
              </div>
            )}

            <div className="space-y-2.5 pb-4">
              {nearbySelected.size > 0 ? (
                <button
                  onClick={handleGroupWithNearby}
                  disabled={actionLoading}
                  data-testid="btn-crear-caso"
                  className="w-full flex items-center justify-center gap-2 bg-caoba text-perla font-bold text-sm min-h-11 px-5 rounded-3xl-3 hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Crear Caso de Obra ({1 + nearbySelected.size} reportes)
                </button>
              ) : (
                <button
                  onClick={() => handleAccept(selectedReport.id, editedCategoriaId)}
                  disabled={actionLoading}
                  data-testid="btn-aceptar"
                  className="w-full flex items-center justify-center gap-2 bg-sol-camba text-perla font-bold text-sm min-h-11 px-5 rounded-3xl-3 hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aceptar solo
                </button>
              )}

              <button
                onClick={() => handleReject(selectedReport.id)}
                disabled={actionLoading}
                data-testid="btn-rechazar"
                className="w-full flex items-center justify-center gap-2 bg-yeso text-ladrillo font-semibold text-sm min-h-11 px-5 rounded-3xl-3 border border-arcilla hover:bg-arcilla disabled:opacity-50 transition-all"
              >
                <XCircle className="w-4 h-4" />
                Rechazar reporte
              </button>

              <button
                onClick={() => handleBanDevice(selectedReport)}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-1.5 text-arena hover:text-ladrillo hover:bg-yeso min-h-9 px-5 rounded-3xl-3 text-xs font-medium transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                Marcar como spam / Banear dispositivo
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── COL 3: Contexto espacial (obras + reportes cercanos) ── */}
      <section className="w-[300px] shrink-0 bg-perla flex flex-col">
        <div className="px-4 py-3 border-b border-arcilla bg-lienzo/60">
          <h2 className="font-semibold text-tierra text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-caoba" />
            Contexto espacial
          </h2>
          {selectedReport && (
            <p className="text-[10px] text-arena mt-0.5">
              {nearbyObras.length > 0 && `${nearbyObras.length} obra${nearbyObras.length > 1 ? 's' : ''} activa${nearbyObras.length > 1 ? 's' : ''}`}
              {nearbyObras.length > 0 && nearbyReports.length > 0 && ' · '}
              {nearbyReports.length > 0 && `${nearbyReports.length} reporte${nearbyReports.length > 1 ? 's' : ''} ≤100 m`}
              {nearbyObras.length === 0 && nearbyReports.length === 0 && 'Sin contexto cercano'}
            </p>
          )}
        </div>

        {!selectedReport ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-xs text-arena text-center italic">
              Selecciona un reporte para ver el contexto espacial.
            </p>
          </div>
        ) : (
          <NearbyReportsList
            nearby={nearbyReports}
            nearbyObras={nearbyObras}
            selectedIds={nearbySelected}
            onToggle={toggleNearby}
            onOpenDetail={setNearbyDetailReport}
            onAddToObra={handleAddToObra}
          />
        )}
      </section>

      {/* ── Modal: Detalle de reporte cercano ── */}
      {nearbyDetailReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-catedral/50 backdrop-blur-sm p-4">
          <div className="bg-perla w-full max-w-sm rounded-3xl-3 shadow-2xl border border-arcilla overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-arcilla bg-lienzo/60">
              <div className="flex items-center gap-2">
                <span className="bg-yeso text-ladrillo px-2 py-0.5 rounded-xl text-xs font-mono font-bold border border-arcilla">
                  #{nearbyDetailReport.id}
                </span>
                <span className="text-xs font-semibold text-tierra">
                  {CATEGORIA_NAMES[nearbyDetailReport.categoria_id] ?? 'Otro'}
                </span>
              </div>
              <button
                onClick={() => setNearbyDetailReport(null)}
                className="text-arena hover:text-tierra hover:bg-yeso p-1.5 rounded-pill transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <img
              src={getImageUrl(nearbyDetailReport.url_imagen)}
              alt="Evidencia"
              className="w-full h-48 object-cover bg-yeso"
            />

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Coordenadas
                  </p>
                  <p className="font-mono text-xs text-tierra">
                    {Number(nearbyDetailReport.lat).toFixed(5)},<br />{Number(nearbyDetailReport.lng).toFixed(5)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Distancia
                  </p>
                  <p className="text-sm font-bold text-caoba">
                    {nearbyDetailReport.distanciaM < 1000
                      ? `${Math.round(nearbyDetailReport.distanciaM)} m`
                      : `${(nearbyDetailReport.distanciaM / 1000).toFixed(1)} km`}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-arena uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Device ID
                </p>
                <p className="font-mono text-xs text-tierra truncate">{nearbyDetailReport.device_id}</p>
              </div>

              <label className="flex items-center gap-3 bg-yeso rounded-3xl-2 px-3 py-2.5 border border-arcilla cursor-pointer">
                <input
                  type="checkbox"
                  checked={nearbySelected.has(nearbyDetailReport.id)}
                  onChange={() => toggleNearby(nearbyDetailReport.id)}
                  className="w-4 h-4 rounded accent-catedral shrink-0"
                />
                <span className="text-xs font-semibold text-tierra">
                  {nearbySelected.has(nearbyDetailReport.id)
                    ? 'Incluido en el grupo'
                    : 'Incluir en el grupo'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

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

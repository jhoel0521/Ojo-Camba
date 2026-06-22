import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  listPending,
  acceptReport,
  rejectReport as rejectReportApi,
  createGroup,
  type PendingReport,
} from '../lib/adminApi';
import { friendlyError } from '../lib/errors';
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

  const handleAccept = (id: number) => {
    if (!user) return;
    setConfirmModal({
      title: 'Aceptar reporte',
      message: `Al aceptar el reporte #${id}, se creara automaticamente un Caso de Obra.`,
      action: async () => {
        await acceptReport(id, user.id);
        setReportes((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => t - 1);
      },
    });
  };

  const handleReject = (id: number) => {
    setConfirmModal({
      title: 'Rechazar reporte',
      message: `El reporte #${id} sera rechazado permanentemente.`,
      action: async () => {
        await rejectReportApi(id);
        setReportes((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => t - 1);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-xl text-tierra">Revision de reportes</h2>
          <p className="text-sm text-arena mt-0.5">
            {total} pendiente{total !== 1 ? 's' : ''} · {groups.length} zona
            {groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs font-medium text-caoba hover:text-tierra disabled:opacity-50 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {loading && reportes.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-perla rounded-3xl-3 p-6 animate-pulse">
              <div className="h-4 bg-yeso rounded w-32 mb-3" />
              <div className="h-12 bg-yeso rounded-2xl" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-arena">No hay reportes pendientes.</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((g) => (
            <PendingGroupCard
              key={g.h3Cell}
              h3Cell={g.h3Cell}
              reportes={g.reportes}
              selectedIds={selectedIds}
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
              onAccept={handleAccept}
              onReject={handleReject}
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={20} onPageChange={setPage} />

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

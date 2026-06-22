import { ChevronDown, ChevronRight, FolderPlus, X } from 'lucide-react';
import { useState } from 'react';
import PendingReportCard from './PendingReportCard';
import type { PendingReport } from '../lib/adminApi';

interface PendingGroupCardProps {
  h3Cell: string;
  reportes: PendingReport[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onGroupSelected: () => void;
  onRejectSelected: () => void;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  loading?: boolean;
}

export default function PendingGroupCard({
  h3Cell,
  reportes,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onGroupSelected,
  onRejectSelected,
  onAccept,
  onReject,
  loading,
}: PendingGroupCardProps) {
  const [open, setOpen] = useState(reportes.length > 1);
  const selectedCount = reportes.filter((r) => selectedIds.has(r.id)).length;
  const categoriaCounts: Record<string, number> = {};
  reportes.forEach((r) => {
    const cat = r.categoria_id.toString();
    categoriaCounts[cat] = (categoriaCounts[cat] || 0) + 1;
  });
  const topCategoria = Object.entries(categoriaCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-lienzo rounded-3xl-3 overflow-hidden border border-arcilla">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-perla hover:bg-yeso transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-arena shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-arena shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-tierra truncate">
              Zona {h3Cell.slice(0, 10)}...
            </p>
            <p className="text-xs text-arena">
              {reportes.length} reporte{reportes.length > 1 ? 's' : ''}
              {topCategoria && ` · ${topCategoria[0]}`}
            </p>
          </div>
        </div>
        {selectedCount > 0 && (
          <span className="text-xs font-semibold text-sol-camba bg-sol-camba/10 px-2 py-0.5 rounded-pill shrink-0">
            {selectedCount} seleccionados
          </span>
        )}
      </button>

      {open && (
        <div className="p-3 space-y-2">
          {reportes.length > 1 && (
            <div className="flex items-center gap-2 pb-2 border-b border-arcilla">
              <button
                onClick={onSelectAll}
                className="text-xs font-medium text-caoba hover:text-tierra transition-colors"
              >
                {selectedCount === reportes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              {selectedCount >= 2 && (
                <>
                  <span className="text-arena text-xs">·</span>
                  <button
                    onClick={onGroupSelected}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs font-semibold text-sol-camba hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Agrupar {selectedCount} → Caso de Obra
                  </button>
                </>
              )}
              {selectedCount >= 1 && (
                <>
                  <span className="text-arena text-xs">·</span>
                  <button
                    onClick={onRejectSelected}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar seleccionados
                  </button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            {reportes.map((r) => (
              <PendingReportCard
                key={r.id}
                id={r.id}
                categoria_id={r.categoria_id}
                url_imagen={r.url_imagen}
                device_id={r.device_id}
                creado_en={r.creado_en}
                selected={selectedIds.has(r.id)}
                onSelect={reportes.length > 1 ? onToggleSelect : undefined}
                onAccept={reportes.length === 1 ? onAccept : undefined}
                onReject={reportes.length === 1 ? onReject : undefined}
                loading={loading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

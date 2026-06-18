import { useEffect, useState, useMemo } from 'react';
import React from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import * as h3 from 'h3-js';
import { fetchAPI } from '../lib/api';
import { useAppStore } from '../store/appStore';
import 'leaflet/dist/leaflet.css';

const CAT_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#f59e0b',
  3: '#6b7280',
  4: '#2563eb',
  5: '#16a34a',
  6: '#7c3aed',
};

interface HeatmapDetail {
  h3_cell: string;
  categoria_id: number;
  count: string;
}

function HeatmapLayer() {
  const [data, setData] = useState<HeatmapDetail[]>([]);
  const { resolution, soloActivos, categorias } = useAppStore((s) => s.filters);

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams({
        resolution: String(resolution),
        solo_activos: String(soloActivos),
      });
      fetchAPI<HeatmapDetail[]>(`/reportes/heatmap-detailed?${params}`)
        .then(setData)
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [resolution, soloActivos]);

  const grouped = useMemo(() => {
    const map = new Map<string, { catId: number; count: number }[]>();
    for (const d of data) {
      const catId = Number(d.categoria_id);
      if (!categorias.includes(catId)) continue;
      const rows = map.get(d.h3_cell) || [];
      rows.push({ catId, count: parseInt(d.count, 10) });
      map.set(d.h3_cell, rows);
    }
    return map;
  }, [data, categorias]);

  const entries = [...grouped].filter(([, rows]) => rows.length > 0);
  const maxTotal = Math.max(...entries.map(([, rows]) => rows.reduce((s, r) => s + r.count, 0)), 1);

  return (
    <>
      {entries.map(([cell, rows]) => {
        const total = rows.reduce((s, r) => s + r.count, 0);
        const alphas = total / maxTotal;
        const boundaries = h3.cellToBoundary(cell);
        const positions = boundaries.map(([lat, lng]) => [lat, lng] as [number, number]);

        if (rows.length === 1) {
          const color = CAT_COLORS[rows[0].catId] || '#888';
          return (
            <Polygon
              key={cell}
              positions={positions}
              pathOptions={{
                fillColor: color,
                color: color,
                weight: 1,
                fillOpacity: 0.18 + alphas * 0.45,
              }}
            >
              <Tooltip direction="center">
                <div className="text-center">
                  <p className="font-semibold text-xs">
                    {total} reporte{total !== 1 ? 's' : ''}
                  </p>
                </div>
              </Tooltip>
            </Polygon>
          );
        }

        rows.sort((a, b) => b.count - a.count);

        return (
          <React.Fragment key={cell}>
            {rows.map((r) => {
              const color = CAT_COLORS[r.catId] || '#888';
              const fraction = r.count / total;
              return (
                <Polygon
                  key={`${cell}-${r.catId}`}
                  positions={positions}
                  pathOptions={{
                    fillColor: color,
                    color: 'transparent',
                    weight: 0,
                    fillOpacity: Math.max(0.08, 0.15 + fraction * 0.35 * alphas),
                  }}
                />
              );
            })}
            <Polygon
              positions={positions}
              pathOptions={{ fill: false, color: 'rgba(0,0,0,0.25)', weight: 1 }}
            >
              <Tooltip direction="center">
                <div className="text-center">
                  <p className="font-semibold text-xs mb-1">
                    {total} reporte{total !== 1 ? 's' : ''}
                  </p>
                  {rows.map((r) => (
                    <div key={r.catId} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CAT_COLORS[r.catId] || '#888' }}
                      />
                      <span>{r.count}</span>
                    </div>
                  ))}
                </div>
              </Tooltip>
            </Polygon>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function HeatmapView({ lat, lng }: { lat: number; lng: number }) {
  const isMobile = useAppStore((s) => s.device?.isMobile ?? true);

  return (
    <div className="h-full w-full relative">
      <MapContainer center={[lat, lng]} zoom={14} className="h-full w-full" zoomControl={!isMobile}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer />
      </MapContainer>
    </div>
  );
}

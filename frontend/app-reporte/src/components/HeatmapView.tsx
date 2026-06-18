import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import * as h3 from 'h3-js';
import { fetchAPI } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { CATEGORIA_NAMES } from '../lib/categories';
import { CAT_COLORS } from '../lib/catColors';
import 'leaflet/dist/leaflet.css';

interface HeatmapDetail {
  h3_cell: string;
  categoria_id: number;
  count: string;
}

function HeatmapLayer() {
  const [data, setData] = useState<HeatmapDetail[]>([]);
  const { resolution, soloActivos, categorias } = useAppStore((s) => s.filters);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams({
        resolution: String(resolution),
        solo_activos: String(soloActivos),
      });
      fetchAPI<HeatmapDetail[]>(`/admin/groups/heatmap?${params}`)
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
              interactive
              pathOptions={{
                fillColor: color,
                color: color,
                weight: 1,
                fillOpacity: 0.18 + alphas * 0.45,
              }}
            >
              <Popup>
                <div className="text-center min-w-[120px]">
                  <div className="flex items-center gap-1.5 justify-center mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="font-semibold text-sm text-tierra">
                      {CATEGORIA_NAMES[rows[0].catId] ?? 'Otro'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {total} reporte{total !== 1 ? 's' : ''}
                  </p>
                  <button
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/hexagono/${resolution}/${cell}`);
                    }}
                    onClick={() => navigate(`/hexagono/${resolution}/${cell}`)}
                    className="px-4 py-1.5 bg-catedral text-perla text-xs font-medium rounded-pill w-full"
                  >
                    Ver reportes
                  </button>
                </div>
              </Popup>
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
                  interactive={false}
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
              interactive
              pathOptions={{ fillOpacity: 0, color: 'rgba(0,0,0,0.25)', weight: 1 }}
            >
              <Popup>
                <div className="min-w-[140px]">
                  <p className="font-semibold text-sm text-tierra mb-2">
                    {total} reporte{total !== 1 ? 's' : ''}
                  </p>
                  {rows.map((r) => (
                    <div key={r.catId} className="flex items-center gap-1.5 text-xs mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CAT_COLORS[r.catId] || '#888' }}
                      />
                      <span className="flex-1">{CATEGORIA_NAMES[r.catId] ?? 'Otro'}</span>
                      <span className="text-gray-400 font-medium">{r.count}</span>
                    </div>
                  ))}
                  <button
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/hexagono/${resolution}/${cell}`);
                    }}
                    onClick={() => navigate(`/hexagono/${resolution}/${cell}`)}
                    className="mt-2 px-4 py-1.5 bg-catedral text-perla text-xs font-medium rounded-pill w-full"
                  >
                    Ver reportes
                  </button>
                </div>
              </Popup>
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
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        className="h-full w-full"
        zoomControl={!isMobile}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer />
      </MapContainer>
    </div>
  );
}

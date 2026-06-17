import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import * as h3 from 'h3-js';
import { fetchAPI } from '../lib/api';
import { useAppStore } from '../store/appStore';
import 'leaflet/dist/leaflet.css';

interface HeatmapData {
  h3_cell: string;
  count: string;
}

function HeatmapLayer() {
  const [data, setData] = useState<HeatmapData[]>([]);
  const soloConReportes = useAppStore((s) => s.soloConReportes);

  useEffect(() => {
    const load = () => {
      fetchAPI<HeatmapData[]>('/reportes/heatmap')
        .then(setData)
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data.length) return null;

  const maxCount = Math.max(...data.map((d) => parseInt(d.count, 10)), 1);
  const filtered = soloConReportes ? data.filter((d) => parseInt(d.count, 10) > 0) : data;

  return (
    <>
      {filtered.map((d) => {
        const count = parseInt(d.count, 10);
        const intensity = count / maxCount;
        const boundaries = h3.cellToBoundary(d.h3_cell);
        const positions = boundaries.map(([lat, lng]) => [lat, lng] as [number, number]);

        const r = Math.round(27 + intensity * 200);
        const g = Math.round(20 + intensity * 60);
        const b = Math.round(16 + intensity * 40);

        return (
          <Polygon
            key={d.h3_cell}
            positions={positions}
            pathOptions={{
              fillColor: `rgba(${r},${g},${b},${0.25 + intensity * 0.35})`,
              color: `rgba(${r},${g},${b},0.6)`,
              weight: 1,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="center" permanent={false}>
              <div className="text-center">
                <p className="font-semibold text-xs">
                  {count} reporte{count !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] opacity-60 font-mono">{d.h3_cell}</p>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}

export default function HeatmapView({ lat, lng }: { lat: number; lng: number }) {
  const isMobile = useAppStore((s) => s.device?.isMobile ?? true);
  const soloConReportes = useAppStore((s) => s.soloConReportes);
  const toggle = useAppStore((s) => s.toggleSoloConReportes);

  return (
    <div className="h-full w-full relative">
      {!isMobile && (
        <div className="absolute top-4 right-4 z-[1000] bg-perla rounded-3xl-3 shadow-md border border-arcilla px-4 py-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloConReportes}
              onChange={toggle}
              className="accent-catedral w-4 h-4"
            />
            <span className="text-xs font-medium text-tierra">Solo activos</span>
          </label>
        </div>
      )}

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

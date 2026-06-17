import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { fetchAPI } from '../lib/api';
import { useAppStore } from '../store/appStore';
import 'leaflet/dist/leaflet.css';

interface HeatmapData {
  h3_cell: string;
  count: string;
}

const DEFAULT_CENTER = { lat: -17.783305154452698, lng: -63.18211291793538 };

function HeatmapLayer({ center }: { center: { lat: number; lng: number } }) {
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

  const filtered = soloConReportes ? data.filter((d) => parseInt(d.count, 10) > 0) : data;

  const features = filtered.map((d) => ({
    type: 'Feature' as const,
    properties: { count: parseInt(d.count, 10) },
    geometry: {
      type: 'Point' as const,
      coordinates: [center.lng, center.lat],
    },
  }));

  const geojson = { type: 'FeatureCollection' as const, features };

  return (
    <GeoJSON
      data={geojson}
      pointToLayer={(_, latlng) => {
        const total = filtered.reduce((s, d) => s + parseInt(d.count, 10), 0);
        const intensity = Math.min(total / 20, 1);
        const size = 6 + intensity * 30;
        const r = Math.round(27 + intensity * 228);
        const g = Math.round(20 + intensity * 120);
        const b = Math.round(16 + intensity * 20);
        return L.circleMarker(latlng, {
          radius: size,
          fillColor: `rgb(${r},${g},${b})`,
          color: 'transparent',
          fillOpacity: 0.7,
        });
      }}
    />
  );
}

export default function HeatmapView({ lat, lng }: { lat: number; lng: number }) {
  const isMobile = useAppStore((s) => s.device?.isMobile ?? true);
  const soloConReportes = useAppStore((s) => s.soloConReportes);
  const toggle = useAppStore((s) => s.toggleSoloConReportes);

  const center = lat && lng ? { lat, lng } : DEFAULT_CENTER;

  return (
    <div>
      {!isMobile && (
        <div className="absolute top-16 right-4 z-[1000] bg-perla rounded-3xl-3 shadow-md border border-arcilla px-4 py-2">
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

      <div className={isMobile ? 'h-[60vh]' : 'h-[calc(100vh-56px)] w-full'}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          className="h-full w-full"
          zoomControl={!isMobile}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatmapLayer center={center} />
        </MapContainer>
      </div>
    </div>
  );
}

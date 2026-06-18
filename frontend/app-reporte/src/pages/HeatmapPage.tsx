import { useGeolocation } from '../hooks/useGeolocation';
import HeatmapView from '../components/HeatmapView';
import { Loader2 } from 'lucide-react';

const DEFAULT_CENTER = { lat: -17.783305154452698, lng: -63.18211291793538 };

export default function HeatmapPage() {
  const geo = useGeolocation();

  if (geo.status === 'granted') {
    return <HeatmapView lat={geo.lat} lng={geo.lng} />;
  }

  if (geo.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-caoba animate-spin mx-auto mb-3" />
          <p className="text-sm text-caoba">Obteniendo ubicacion...</p>
        </div>
      </div>
    );
  }

  return <HeatmapView lat={DEFAULT_CENTER.lat} lng={DEFAULT_CENTER.lng} />;
}

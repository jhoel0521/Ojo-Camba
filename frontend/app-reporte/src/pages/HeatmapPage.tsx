import { useGeolocation } from '../hooks/useGeolocation';
import HeatmapView from '../components/HeatmapView';
import { useAppStore } from '../store/appStore';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';

const DEFAULT_CENTER = { lat: -17.783305154452698, lng: -63.18211291793538 };

export default function HeatmapPage() {
  const geo = useGeolocation();
  const isMobile = useAppStore((s) => s.device?.isMobile ?? true);

  if (geo.status === 'granted') {
    return (
      <div>
        {isMobile && (
          <div className="bg-catedral text-lienzo px-4 py-6">
            <p className="text-xs text-arena uppercase tracking-wide">Tu ubicacion</p>
            <div className="flex items-center gap-2 mt-1 text-sm text-arena">
              <MapPin className="w-4 h-4" />
              {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
            </div>
          </div>
        )}
        <HeatmapView lat={geo.lat} lng={geo.lng} />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-catedral text-lienzo px-6 py-12 text-center">
        <div className="w-20 h-20 bg-lienzo/10 rounded-3xl-3 flex items-center justify-center mb-6 mx-auto">
          {geo.status === 'loading' ? (
            <Loader2 className="w-10 h-10 text-sol-camba animate-spin" />
          ) : geo.status === 'denied' ? (
            <AlertTriangle className="w-10 h-10 text-sol-camba" />
          ) : (
            <MapPin className="w-10 h-10 text-sol-camba" />
          )}
        </div>
        <h2 className="font-semibold text-2xl text-lienzo mb-3">Ojo Camba</h2>
        <p className="text-arena max-w-xs mx-auto leading-relaxed">
          {geo.status === 'loading' && 'Obteniendo tu ubicacion...'}
          {geo.status === 'denied' && 'Activa el GPS para ver el mapa de reportes.'}
          {geo.status === 'timeout' && 'La ubicacion esta tardando. Verifica tu GPS.'}
          {geo.status === 'unavailable' && 'GPS no disponible en este dispositivo.'}
        </p>
        {geo.status === 'denied' && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-sol-camba text-catedral text-sm font-bold rounded-pill"
          >
            Ya lo active
          </button>
        )}
      </div>

      <div className={isMobile ? 'h-[60vh]' : 'h-[calc(100vh-56px)] w-full'}>
        <HeatmapView lat={DEFAULT_CENTER.lat} lng={DEFAULT_CENTER.lng} />
      </div>
    </div>
  );
}

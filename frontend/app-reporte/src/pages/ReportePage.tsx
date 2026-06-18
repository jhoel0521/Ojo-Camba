import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDeviceId } from '../lib/device';
import { fetchAPI } from '../lib/api';
import { enqueue, getQueue } from '../lib/offlineQueue';
import { useAuthStore } from '../store/authStore';
import { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Construction,
  Lightbulb,
  Trash2,
  Droplets,
  TrafficCone,
  HelpCircle,
} from 'lucide-react';

const CATEGORIAS = [
  { id: 1, nombre: 'Bache', Icon: Construction },
  { id: 2, nombre: 'Luminaria', Icon: Lightbulb },
  { id: 3, nombre: 'Residuos', Icon: Trash2 },
  { id: 4, nombre: 'Alcantarillado', Icon: Droplets },
  { id: 5, nombre: 'Trafico', Icon: TrafficCone },
  { id: 6, nombre: 'Otro', Icon: HelpCircle },
];

export default function ReportePage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const [imagen, setImagen] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [gravedad, setGravedad] = useState('Media');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagen(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (geo.status !== 'granted' || !imagen || !categoriaId) return;
    setEnviando(true);
    setError(null);

    const body = {
      device_id: getDeviceId(),
      lat: geo.lat,
      lng: geo.lng,
      categoria_id: categoriaId,
      gravedad,
      imagen_base64: imagen,
      usuario_id: user?.id ?? undefined,
    };

    if (!navigator.onLine) {
      enqueue(body);
      setEnviado(true);
      setEnviando(false);
      return;
    }

    try {
      await fetchAPI('/reportes', { method: 'POST', body: JSON.stringify(body) });
      setEnviado(true);
    } catch {
      enqueue(body);
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar = geo.status === 'granted' && imagen && categoriaId && !enviando;

  if (enviado) {
    const pendientes = getQueue().length;
    const offline = !navigator.onLine;

    const resetForm = () => {
      setImagen(null);
      setCategoriaId(null);
      setGravedad('Media');
      setEnviado(false);
      setError(null);
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <CheckCircle2 className="w-12 h-12 text-sol-camba mb-3" />
        <h2 className="font-semibold text-lg text-tierra mb-1">
          {pendientes > 0 ? 'Reporte Guardado' : 'Reporte Enviado'}
        </h2>
        <p className="text-xs text-caoba mb-4 max-w-xs">
          {pendientes > 0
            ? `${pendientes} reporte${pendientes !== 1 ? 's' : ''} en cola. Se enviara${pendientes !== 1 ? 'n' : ''} al reconectar.`
            : 'Gracias por ayudar a Santa Cruz.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={resetForm}
            className="px-5 py-2.5 bg-catedral text-perla text-sm font-medium rounded-pill"
          >
            Seguir reportando
          </button>
          {!offline && (
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-perla border border-arcilla text-tierra text-sm font-medium rounded-pill"
            >
              Volver al mapa
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-arcilla bg-perla">
        <button
          onClick={() => navigate(-1)}
          className="w-7 h-7 flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-caoba" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm text-tierra truncate">Nuevo Reporte</h2>
        </div>
        {geo.status === 'granted' && (
          <span className="text-[10px] text-arena shrink-0">
            {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {geo.status === 'denied' && (
          <div className="bg-sol-camba/10 rounded-2xl p-2.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sol-camba shrink-0 mt-0.5" />
            <p className="text-[11px] text-catedral font-medium leading-snug">
              Activa el GPS en Configuracion para reportar.
            </p>
          </div>
        )}
        {geo.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-4 text-caoba">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Ubicacion...</span>
          </div>
        )}

        {!navigator.onLine && geo.status === 'granted' && (
          <div className="bg-arcilla/50 rounded-2xl p-2 text-[10px] text-caoba text-center">
            Sin conexion — verifica que la ubicacion sea correcta
          </div>
        )}

        <div>
          {imagen ? (
            <div className="relative">
              <img src={imagen} alt="Preview" className="w-full rounded-3xl-3" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setImagen(null);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-catedral/80 text-perla rounded-full flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              className="bg-perla rounded-3xl-3 flex flex-col items-center justify-center gap-2 py-12 border-2 border-dashed border-arcilla cursor-pointer"
            >
              <Camera className="w-8 h-8 text-caoba min-h-[135px]" />
              <span className="text-sm font-medium text-caoba">Tomar foto</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
        </div>

        <p className="text-[10px] text-arena font-medium uppercase tracking-wide">Categoria</p>
        <div className="grid grid-cols-3 rounded-3xl-2 overflow-hidden border border-arcilla">
          {CATEGORIAS.map(({ id, nombre, Icon }, i) => {
            const active = categoriaId === id;
            const isLastCol = (i + 1) % 3 === 0;
            const isLastRow = i >= 3;
            return (
              <button
                key={id}
                onClick={() => setCategoriaId(id)}
                className={`flex flex-col items-center gap-1 py-2.5 transition-all ${!isLastCol ? 'border-r border-arcilla' : ''} ${!isLastRow ? 'border-b border-arcilla' : ''} ${active ? 'bg-catedral text-perla' : 'bg-perla text-tierra'}`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-perla' : 'text-ladrillo'}`} />
                <span className="text-[10px] font-semibold">{nombre}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-arena font-medium uppercase tracking-wide">Gravedad</p>
        <div className="grid grid-cols-4 rounded-3xl-2 overflow-hidden border border-arcilla">
          {['Baja', 'Media', 'Alta', 'Emergencia'].map((g, i) => (
            <button
              key={g}
              onClick={() => setGravedad(g)}
              className={`py-2 text-[11px] font-medium transition-all ${i < 3 ? 'border-r border-arcilla' : ''} ${gravedad === g ? 'bg-catedral text-perla' : 'bg-perla text-tierra'}`}
            >
              {g}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-yeso rounded-2xl p-3 text-center">
            <AlertCircle className="w-5 h-5 text-sol-camba mx-auto mb-1" />
            <p className="text-[11px] text-catedral font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-arcilla bg-lienzo">
        <button
          onClick={handleSubmit}
          disabled={!puedeEnviar}
          className="w-full bg-catedral text-perla font-semibold text-sm py-3 rounded-pill disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
            </>
          ) : (
            'Enviar Reporte'
          )}
        </button>
        {!puedeEnviar && !enviando && (
          <p className="text-[10px] text-arena text-center mt-1">
            {geo.status !== 'granted' ? 'GPS · ' : ''}
            {!imagen ? 'Foto · ' : ''}
            {!categoriaId ? 'Categoria' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

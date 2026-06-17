import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDeviceId } from '../lib/device';
import { fetchAPI } from '../lib/api';
import { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  MapPin,
  Construction,
  Lightbulb,
  Trash2,
  Droplets,
  TrafficCone,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
  const [imagen, setImagen] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [gravedad, setGravedad] = useState('Media');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      await fetchAPI('/reportes', {
        method: 'POST',
        body: JSON.stringify({
          device_id: getDeviceId(),
          lat: geo.lat,
          lng: geo.lng,
          categoria_id: categoriaId,
          gravedad,
          imagen_base64: imagen,
        }),
      });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar = geo.status === 'granted' && imagen && categoriaId && !enviando;

  if (enviado) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-sol-camba/20 rounded-3xl-3 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-sol-camba" />
        </div>
        <h2 className="font-semibold text-2xl text-tierra mb-2">Reporte Enviado</h2>
        <p className="text-sm text-caoba mb-8 max-w-xs">
          Tu reporte fue registrado exitosamente. Gracias por ayudar a mejorar Santa Cruz.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-catedral text-perla font-medium rounded-pill"
        >
          Volver al Mapa
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-catedral text-lienzo px-4 py-6">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-arena text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <h2 className="font-semibold text-2xl">Nuevo Reporte</h2>
          {geo.status === 'granted' && (
            <div className="flex items-center gap-2 mt-2 text-sm text-arena">
              <MapPin className="w-4 h-4" />
              {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-5 pb-24">
        {geo.status === 'denied' && (
          <div className="bg-sol-camba/15 rounded-3xl-3 p-4 mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-sol-camba flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-catedral">GPS requerido</p>
              <p className="text-xs text-caoba mt-1">
                Activa la ubicacion en Configuracion para reportar.
              </p>
            </div>
          </div>
        )}

        {geo.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8 text-caoba">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Obteniendo ubicacion...</span>
          </div>
        )}

        <div className="mb-5">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">
            1. Foto del problema
          </p>
          {imagen ? (
            <div className="relative">
              <img
                src={imagen}
                alt="Preview"
                className="w-full aspect-[4/3] object-cover rounded-3xl-3"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setImagen(null);
                }}
                className="absolute top-3 right-3 w-9 h-9 bg-catedral/80 backdrop-blur text-perla rounded-2xl flex items-center justify-center"
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
              className="w-full aspect-[4/3] bg-perla rounded-3xl-3 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-arcilla hover:border-caoba transition-colors cursor-pointer"
            >
              <div className="w-16 h-16 bg-lienzo rounded-3xl-2 flex items-center justify-center">
                <Camera className="w-8 h-8 text-ladrillo" />
              </div>
              <span className="text-sm font-medium text-caoba">Tocar para tomar foto</span>
              <span className="text-xs text-arena">Obligatorio</span>
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

        <div className="mb-5">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">
            2. Categoria
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIAS.map(({ id, nombre, Icon }) => (
              <button
                key={id}
                onClick={() => setCategoriaId(id)}
                className={`flex flex-col items-center gap-2 py-3.5 rounded-3xl-2 border transition-all ${
                  categoriaId === id
                    ? 'bg-catedral text-perla border-catedral'
                    : 'bg-perla text-tierra border-arcilla hover:border-caoba'
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${categoriaId === id ? 'text-perla' : 'text-ladrillo'}`}
                />
                <span className="text-xs font-semibold">{nombre}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold text-arena uppercase tracking-wider mb-3">
            3. Gravedad
          </p>
          <div className="flex gap-2">
            {['Baja', 'Media', 'Alta', 'Emergencia'].map((g) => (
              <button
                key={g}
                onClick={() => setGravedad(g)}
                className={`px-4 py-2.5 rounded-pill text-xs font-semibold border transition-all ${
                  gravedad === g
                    ? 'bg-catedral text-perla border-catedral'
                    : 'bg-perla text-tierra border-arcilla hover:border-caoba'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rosa-toborochi/10 border border-rosa-toborochi/20 text-catedral text-sm p-4 rounded-3xl-2 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rosa-toborochi flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!puedeEnviar}
          className="w-full bg-catedral text-perla font-semibold text-base py-4 rounded-pill disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Reporte'
          )}
        </button>

        {!puedeEnviar && !enviando && (
          <p className="text-xs text-arena text-center mt-3">
            {geo.status !== 'granted' ? 'GPS · ' : ''}
            {!imagen ? 'Foto · ' : ''}
            {!categoriaId ? 'Categoria' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Bell,
  Check,
  AlertCircle,
  Loader2,
  Camera,
} from 'lucide-react';
import {
  inferirTriaje,
  sugerenciaHechos,
  ETIQUETAS_UBICACION,
  ETIQUETAS_TEMPORADA,
  type GravedadValor,
  type UbicacionSensible,
  type Temporada,
  type ResultadoTriaje,
} from '../lib/triajeApi';
import { friendlyError } from '../lib/errors';
import GravedadBadge from './GravedadBadge';

interface GravedadSugeridaProps {
  reporteId: number;
  categoriaId: number;
  creadoEn: string;
  /** Distancias de los reportes cercanos ya cargados en la pantalla de revisión. */
  distanciasCercanasM: number[];
  /** IDs de reportes cercanos pendientes, para que "Analizar foto" los coteje por duplicado. */
  nearbyReportIds: number[];
  /** true si la foto es una URL externa (no gestionada por nuestro S3): no se puede analizar. */
  imagenExterna: boolean;
  /** Gravedad que tiene ahora el formulario, para saber si la sugerencia ya se aplicó. */
  gravedadActual: string;
  onAplicar: (gravedad: GravedadValor) => void;
  /** IDs que la IA marcó como "mismo problema" que este reporte, para pre-seleccionar en el grupo. */
  onDuplicadosSugeridos?: (ids: number[]) => void;
}

interface RadioPillsProps<T extends string> {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  testIdPrefix: string;
}

/** Radios estilizados en píldora (mismo patrón que frontend/app-tecnico/src/pages/CasosPage.tsx). */
function RadioPills<T extends string>({
  name,
  value,
  options,
  onChange,
  testIdPrefix,
}: RadioPillsProps<T>) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label key={opt.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
              data-testid={`${testIdPrefix}-${opt.value || 'auto'}`}
            />
            <span
              className={`flex items-center justify-center h-11 px-3.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors ${
                checked
                  ? 'bg-tierra text-perla shadow-sm'
                  : 'bg-yeso text-catedral hover:bg-arcilla hover:text-tierra'
              }`}
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const OPCIONES_UBICACION = Object.entries(ETIQUETAS_UBICACION).map(([value, label]) => ({
  value: value as UbicacionSensible,
  label,
}));

const OPCIONES_TEMPORADA: { value: Temporada | ''; label: string }[] = [
  { value: '', label: 'Automática' },
  { value: 'lluvias', label: ETIQUETAS_TEMPORADA.lluvias },
  { value: 'seca', label: ETIQUETAS_TEMPORADA.seca },
];

const OPCIONES_RIESGO: { value: 'no' | 'si'; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Sí, hay riesgo' },
];

export default function GravedadSugerida({
  reporteId,
  categoriaId,
  creadoEn,
  distanciasCercanasM,
  nearbyReportIds,
  imagenExterna,
  gravedadActual,
  onAplicar,
  onDuplicadosSugeridos,
}: GravedadSugeridaProps) {
  const [ubicacionSensible, setUbicacionSensible] = useState<UbicacionSensible>('ninguna');
  const [palabraClaveRiesgo, setPalabraClaveRiesgo] = useState(false);
  const [temporadaForzada, setTemporadaForzada] = useState<Temporada | ''>('');
  const [trazaAbierta, setTrazaAbierta] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTriaje | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');
  const [notaIa, setNotaIa] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    inferirTriaje({
      categoria_id: categoriaId,
      creado_en: creadoEn,
      distancias_cercanas_m: distanciasCercanasM,
      ubicacion_sensible: ubicacionSensible,
      palabra_clave_riesgo: palabraClaveRiesgo,
      temporada_forzada: temporadaForzada || undefined,
    })
      .then((r) => {
        if (!cancelado) setResultado(r);
      })
      .catch((e) => {
        if (!cancelado) setError(friendlyError(e));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [
    categoriaId,
    creadoEn,
    distanciasCercanasM,
    ubicacionSensible,
    palabraClaveRiesgo,
    temporadaForzada,
  ]);

  async function analizarFoto(): Promise<void> {
    setAnalizando(true);
    setErrorAnalisis('');
    setNotaIa('');
    try {
      const r = await sugerenciaHechos(reporteId, nearbyReportIds);
      setUbicacionSensible(r.ubicacion_sensible);
      setPalabraClaveRiesgo(r.palabra_clave_riesgo);
      setTemporadaForzada(r.parece_lluvia ? 'lluvias' : 'seca');
      setNotaIa(r.justificacion_breve);

      const duplicados = r.duplicados.filter((d) => d.es_mismo_problema).map((d) => d.reporte_id);
      if (duplicados.length > 0) onDuplicadosSugeridos?.(duplicados);
    } catch (e) {
      setErrorAnalisis(friendlyError(e));
    } finally {
      setAnalizando(false);
    }
  }

  const gravedad = resultado?.gravedad_sugerida ?? null;
  const traza = resultado?.traza ?? [];
  const accion = resultado?.accion ?? null;
  const hechos = resultado?.hechos;

  const yaAplicada = gravedad !== null && gravedad === gravedadActual;

  return (
    <div className="pt-3 border-t border-arcilla" data-testid="gravedad-sugerida">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-sol-camba uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Gravedad sugerida
        </label>
        {cargando ? (
          <Loader2 className="w-3.5 h-3.5 text-arena animate-spin" />
        ) : gravedad ? (
          <GravedadBadge gravedad={gravedad} />
        ) : (
          <span className="text-[10px] text-arena font-semibold uppercase tracking-wide">
            Sin sugerencia
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[10px] text-red-700 leading-relaxed mb-2">
          {error}
        </p>
      )}

      {hechos && (
        <p className="text-[10px] text-arena leading-relaxed mb-2">
          {hechos.tipo} · temporada {ETIQUETAS_TEMPORADA[hechos.temporada]}
          {temporadaForzada ? ' (forzada)' : ' (por calendario)'} · {hechos.recurrencia} reporte
          {hechos.recurrencia > 1 ? 's' : ''} ≤100 m · {Math.floor(hechos.horas)} h de antigüedad
        </p>
      )}

      {imagenExterna ? (
        <p className="text-[10px] text-arena italic leading-relaxed mb-3 px-1">
          Esta foto es externa (no está en nuestro almacenamiento): no se puede analizar con IA.
        </p>
      ) : (
        <button
          onClick={analizarFoto}
          disabled={analizando}
          data-testid="btn-analizar-foto"
          className="w-full mb-3 flex items-center justify-center gap-2 bg-yeso border border-caoba/40 text-caoba font-semibold text-xs min-h-11 px-4 rounded-3xl-3 hover:bg-arcilla disabled:opacity-60 transition-colors"
        >
          {analizando ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analizando foto…
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              Analizar foto con IA
            </>
          )}
        </button>
      )}

      {errorAnalisis && (
        <p role="alert" className="text-[10px] text-red-700 leading-relaxed mb-2">
          {errorAnalisis}
        </p>
      )}

      {notaIa && (
        <p className="text-[10px] text-caoba leading-relaxed mb-3 bg-yeso rounded-2xl px-2.5 py-2 border border-arcilla">
          <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
          {notaIa}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <span className="text-[10px] font-bold text-arena uppercase tracking-wide block mb-1.5">
            Ubicación sensible
          </span>
          <RadioPills
            name="ubicacion-sensible"
            value={ubicacionSensible}
            options={OPCIONES_UBICACION}
            onChange={setUbicacionSensible}
            testIdPrefix="radio-ubicacion"
          />
        </div>

        <div>
          <span className="text-[10px] font-bold text-arena uppercase tracking-wide block mb-1.5">
            Temporada
          </span>
          <RadioPills
            name="temporada"
            value={temporadaForzada}
            options={OPCIONES_TEMPORADA}
            onChange={setTemporadaForzada}
            testIdPrefix="radio-temporada"
          />
          <p className="text-[10px] text-arena mt-1.5 leading-relaxed">
            El calendario asume nov-mar = lluvias. Si está lloviendo ahora aunque no sea
            &ldquo;temporada&rdquo;, elegí Lluvias acá.
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-arena uppercase tracking-wide block mb-1.5">
            La descripción menciona riesgo
          </span>
          <RadioPills
            name="palabra-clave-riesgo"
            value={palabraClaveRiesgo ? 'si' : 'no'}
            options={OPCIONES_RIESGO}
            onChange={(v) => setPalabraClaveRiesgo(v === 'si')}
            testIdPrefix="radio-riesgo"
          />
          <p className="text-[10px] text-arena mt-1.5 leading-relaxed">
            hundimiento, cable caído, colapso, herido…
          </p>
        </div>
      </div>

      {accion && (
        <div className="mt-3 bg-yeso border border-caoba/40 rounded-3xl-2 px-3 py-2 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <p className="text-[11px] text-tierra font-semibold">{accion}</p>
        </div>
      )}

      {gravedad === null && (
        <div className="mt-2 flex items-start gap-2 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-arena shrink-0 mt-px" />
          <p className="text-[10px] text-arena leading-relaxed">
            Ninguna regla cubre esta combinación de hechos. El triaje no fuerza una clasificación:
            decide vos.
          </p>
        </div>
      )}

      {gravedad && (
        <button
          onClick={() => onAplicar(gravedad)}
          disabled={yaAplicada}
          data-testid="btn-aplicar-sugerencia"
          className="w-full mt-3 flex items-center justify-center gap-2 bg-perla text-ladrillo border border-ladrillo font-semibold text-xs min-h-11 px-4 rounded-3xl-3 hover:bg-yeso disabled:opacity-50 disabled:hover:bg-perla transition-colors"
        >
          {yaAplicada ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Sugerencia aplicada
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Aplicar sugerencia
            </>
          )}
        </button>
      )}

      {traza.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setTrazaAbierta((v) => !v)}
            data-testid="btn-traza"
            className="flex items-center gap-1 text-[10px] font-semibold text-caoba hover:text-tierra transition-colors"
          >
            {trazaAbierta ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Traza de reglas ({traza.length})
          </button>

          {trazaAbierta && (
            <ol className="mt-1.5 space-y-1.5" data-testid="traza-lista">
              {traza.map((regla, i) => (
                <li
                  key={regla.id}
                  className="bg-lienzo border border-arcilla rounded-2xl px-2.5 py-2 flex gap-2"
                >
                  <span className="text-[10px] font-mono font-bold text-arena shrink-0">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-ladrillo">
                      {regla.id} · Bloque {regla.bloque} → {regla.conclusion}
                    </p>
                    <p className="text-[10px] text-caoba leading-relaxed mt-0.5">{regla.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

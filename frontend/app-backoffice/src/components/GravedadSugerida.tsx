import { useEffect, useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Bell,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  inferirTriaje,
  ETIQUETAS_UBICACION,
  type GravedadValor,
  type UbicacionSensible,
  type ResultadoTriaje,
} from '../lib/triajeApi';
import { friendlyError } from '../lib/errors';
import GravedadBadge from './GravedadBadge';

interface GravedadSugeridaProps {
  categoriaId: number;
  creadoEn: string;
  /** Distancias de los reportes cercanos ya cargados en la pantalla de revisión. */
  distanciasCercanasM: number[];
  /** Gravedad que tiene ahora el formulario, para saber si la sugerencia ya se aplicó. */
  gravedadActual: string;
  onAplicar: (gravedad: GravedadValor) => void;
}

export default function GravedadSugerida({
  categoriaId,
  creadoEn,
  distanciasCercanasM,
  gravedadActual,
  onAplicar,
}: GravedadSugeridaProps) {
  const [ubicacionSensible, setUbicacionSensible] = useState<UbicacionSensible>('ninguna');
  const [palabraClaveRiesgo, setPalabraClaveRiesgo] = useState(false);
  const [trazaAbierta, setTrazaAbierta] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTriaje | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
  }, [categoriaId, creadoEn, distanciasCercanasM, ubicacionSensible, palabraClaveRiesgo]);

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
          {hechos.tipo} · temporada {hechos.temporada} · {hechos.recurrencia} reporte
          {hechos.recurrencia > 1 ? 's' : ''} ≤100 m · {Math.floor(hechos.horas)} h de antigüedad
        </p>
      )}

      <div className="space-y-2">
        <div>
          <span className="text-[10px] font-bold text-arena uppercase tracking-wide">
            Ubicación sensible
          </span>
          <select
            value={ubicacionSensible}
            onChange={(e) => setUbicacionSensible(e.target.value as UbicacionSensible)}
            data-testid="select-ubicacion-sensible"
            className="w-full mt-1 p-2 border border-arcilla rounded-2xl bg-lienzo text-tierra font-semibold text-sm focus:outline-none focus:border-caoba transition-colors"
          >
            {Object.entries(ETIQUETAS_UBICACION).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 bg-yeso rounded-3xl-2 px-3 py-2.5 border border-arcilla cursor-pointer">
          <input
            type="checkbox"
            checked={palabraClaveRiesgo}
            onChange={(e) => setPalabraClaveRiesgo(e.target.checked)}
            data-testid="check-palabra-clave"
            className="w-4 h-4 rounded accent-catedral shrink-0"
          />
          <span className="text-xs font-semibold text-tierra leading-tight">
            La descripción menciona riesgo
            <span className="block text-[10px] font-normal text-arena">
              hundimiento, cable caído, colapso, herido…
            </span>
          </span>
        </label>
      </div>

      {accion && (
        <div className="mt-2 bg-yeso border border-caoba/40 rounded-3xl-2 px-3 py-2 flex items-center gap-2">
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
          className="w-full mt-2 flex items-center justify-center gap-2 bg-perla text-ladrillo border border-ladrillo font-semibold text-xs min-h-9 px-4 rounded-3xl-3 hover:bg-yeso disabled:opacity-50 disabled:hover:bg-perla transition-colors"
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

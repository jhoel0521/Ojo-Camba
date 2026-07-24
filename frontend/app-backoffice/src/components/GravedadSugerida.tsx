import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Bell,
  Check,
  AlertCircle,
  AlertTriangle,
  Bot,
  Loader2,
} from 'lucide-react';
import {
  inferirTriaje,
  tipoDesdeCategoria,
  temporadaDeFecha,
  horasTranscurridas,
  recurrenciaDesdeCercanos,
  ETIQUETAS_UBICACION,
  type GravedadValor,
  type UbicacionSensible,
} from '../lib/triaje';
import { explicar, type ExplicacionIA } from '../lib/explicadorApi';
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

  const hechos = useMemo(
    () => ({
      tipo: tipoDesdeCategoria(categoriaId),
      temporada: temporadaDeFecha(new Date()),
      ubicacion_sensible: ubicacionSensible,
      recurrencia: recurrenciaDesdeCercanos(distanciasCercanasM),
      horas: horasTranscurridas(creadoEn),
      palabra_clave_riesgo: palabraClaveRiesgo,
    }),
    [categoriaId, creadoEn, distanciasCercanasM, ubicacionSensible, palabraClaveRiesgo],
  );

  const { gravedad, traza, accion } = useMemo(() => inferirTriaje(hechos), [hechos]);

  const yaAplicada = gravedad !== null && gravedad === gravedadActual;

  // Explicación con IA — estrictamente bajo demanda para no gastar cuota de la API.
  const [explicando, setExplicando] = useState(false);
  const [explicacion, setExplicacion] = useState<ExplicacionIA | null>(null);
  const [errorIA, setErrorIA] = useState('');

  // Si cambian los hechos, la explicación previa deja de corresponder: se descarta.
  useEffect(() => {
    setExplicacion(null);
    setErrorIA('');
  }, [hechos, gravedad]);

  async function pedirExplicacion(): Promise<void> {
    setExplicando(true);
    setErrorIA('');
    try {
      const resultado = {
        gravedadSugerida: gravedad,
        accion,
        hechos: {
          tipo: hechos.tipo,
          temporada: hechos.temporada,
          ubicacion_sensible: hechos.ubicacion_sensible,
          recurrencia: hechos.recurrencia,
          horasAntiguedad: Math.floor(hechos.horas),
          palabra_clave_riesgo: hechos.palabra_clave_riesgo,
        },
        reglasAplicadas: traza.map((r) => ({
          id: r.id,
          conclusion: r.conclusion,
          descripcion: r.texto,
        })),
      };
      setExplicacion(await explicar('triaje', resultado));
    } catch (e) {
      setExplicacion(null);
      setErrorIA(friendlyError(e));
    } finally {
      setExplicando(false);
    }
  }

  return (
    <div className="pt-3 border-t border-arcilla" data-testid="gravedad-sugerida">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-sol-camba uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Gravedad sugerida
        </label>
        {gravedad ? (
          <GravedadBadge gravedad={gravedad} />
        ) : (
          <span className="text-[10px] text-arena font-semibold uppercase tracking-wide">
            Sin sugerencia
          </span>
        )}
      </div>

      <p className="text-[10px] text-arena leading-relaxed mb-2">
        {hechos.tipo} · temporada {hechos.temporada} · {hechos.recurrencia} reporte
        {hechos.recurrencia > 1 ? 's' : ''} ≤100 m · {Math.floor(hechos.horas)} h de antigüedad
      </p>

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

      {gravedad && (
        <div className="mt-3 pt-3 border-t border-arcilla" data-testid="explicador-ia">
          <button
            onClick={pedirExplicacion}
            disabled={explicando}
            data-testid="btn-explicar-ia"
            className="w-full flex items-center justify-center gap-2 bg-sol-camba/10 text-sol-camba border border-sol-camba/40 font-semibold text-xs min-h-9 px-4 rounded-3xl-3 hover:bg-sol-camba/20 disabled:opacity-60 transition-colors"
          >
            {explicando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generando explicación…
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5" />
                {explicacion ? 'Regenerar explicación' : 'Explicar con IA'}
              </>
            )}
          </button>

          {errorIA && (
            <div
              role="alert"
              className="mt-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-px" />
              <p className="text-[11px] text-red-700 leading-relaxed">{errorIA}</p>
            </div>
          )}

          {explicacion && (
            <div className="mt-2 space-y-2" data-testid="explicacion-ia">
              <div className="bg-lienzo border border-arcilla rounded-3xl-2 px-3 py-2.5">
                <p className="text-[11px] text-tierra leading-relaxed">{explicacion.explicacion}</p>
              </div>

              {explicacion.numerosSospechosos.length > 0 && (
                <div
                  role="alert"
                  data-testid="aviso-numeros-sospechosos"
                  className="bg-red-50 border border-red-300 rounded-2xl px-3 py-2 flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-px" />
                  <p className="text-[10px] text-red-700 leading-relaxed">
                    <strong className="font-bold">Verificá antes de confiar:</strong> la IA mencionó
                    cifras que no están en el análisis ({explicacion.numerosSospechosos.join(', ')}
                    ). Revisalas vos antes de usar esta explicación.
                  </p>
                </div>
              )}

              <p className="text-[9px] text-arena leading-relaxed px-1">
                Texto generado por IA a partir del análisis. Es un apoyo: la decisión es tuya.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

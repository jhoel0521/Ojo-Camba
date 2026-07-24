import { useEffect, useMemo, useState } from 'react';
import { Route, Crosshair, Loader2, Check, X, Bot, AlertTriangle, AlertCircle } from 'lucide-react';
import { getGroupReports, type ReporteDeGrupo } from '../lib/tecnicoApi';
import {
  compararAlgoritmos,
  MAX_REPORTES_COMPARACION,
  type ReporteRuta,
  type ResultadoBusqueda,
} from '../lib/rutaEstados';
import { explicar, type ExplicacionIA } from '../lib/explicadorApi';
import { useGeolocation } from '../hooks/useGeolocation';
import { categoriaName } from '../lib/categories';
import { friendlyError } from '../lib/errors';
import GravedadBadge from './GravedadBadge';

function metros(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function Marca({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="w-3.5 h-3.5 text-selva inline" aria-label="si" />
  ) : (
    <X className="w-3.5 h-3.5 text-arena inline" aria-label="no" />
  );
}

/**
 * RutaOjoCamba: sugiere en qué orden visitar los reportes de un Caso de Obra.
 * Es apoyo a la decisión — no reordena ni cambia el estado de ningún reporte.
 */
export default function RutaSugerida({ grupoId }: { grupoId: number }) {
  // Instancia propia de geolocalización: la del formulario alimenta la corrección
  // GPS del avance y no debe contaminarse con una captura hecha para calcular la ruta.
  const gps = useGeolocation();

  const [reportes, setReportes] = useState<ReporteDeGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    getGroupReports(grupoId)
      .then((rs) => {
        if (!cancelado) setReportes(rs);
      })
      .catch((err) => {
        if (!cancelado) setError(friendlyError(err));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [grupoId]);

  const nodos: ReporteRuta[] = useMemo(
    () =>
      reportes.map((r) => ({
        id: r.id,
        lat: Number(r.lat),
        lng: Number(r.lng),
        gravedad: r.gravedad,
        categoria_id: r.categoria_id,
      })),
    [reportes],
  );

  const demasiados = nodos.length > MAX_REPORTES_COMPARACION;

  const comparacion = useMemo(() => {
    if (!gps.fix || nodos.length < 2 || demasiados) return null;
    return compararAlgoritmos(gps.fix, nodos);
  }, [gps.fix, nodos, demasiados]);

  if (loading) {
    return <div className="bg-perla rounded-3xl-3 h-32 mb-8 animate-pulse" aria-busy="true" />;
  }

  // Solo tiene sentido sugerir un orden si hay al menos dos paradas.
  if (!error && nodos.length < 2) return null;

  return (
    <section data-testid="ruta-sugerida" className="bg-perla rounded-3xl-3 p-5 mb-8 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="font-semibold text-sm text-tierra flex items-center gap-2">
          <Route className="w-4 h-4 text-caoba" />
          Ruta sugerida
        </h3>
        <span className="text-xs text-arena shrink-0">{nodos.length} reportes</span>
      </div>
      <p className="text-xs text-arena mb-4">
        Sugerencia de apoyo: vos decidís tu recorrido. No cambia el estado de ningún reporte.
      </p>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!error && demasiados && (
        <p className="text-xs text-arena italic py-2">
          Este caso tiene {nodos.length} reportes. La comparación exhaustiva se limita a{' '}
          {MAX_REPORTES_COMPARACION} porque el número de rutas crece como n!.
        </p>
      )}

      {!error && !demasiados && (
        <>
          <div className="rounded-3xl-3 border border-arcilla p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ladrillo uppercase tracking-wide mb-0.5">
                  Base del recorrido
                </p>
                <p className="text-xs text-arena">
                  {gps.fix
                    ? `Tu ubicacion: ${gps.fix.lat.toFixed(6)}, ${gps.fix.lng.toFixed(6)}`
                    : 'Necesito tu ubicacion actual para calcular la ruta.'}
                </p>
              </div>
              <button
                type="button"
                onClick={gps.capture}
                disabled={gps.status === 'loading'}
                data-testid="btn-gps-ruta"
                className="flex items-center gap-1.5 bg-lienzo border border-selva text-selva text-xs font-medium px-3 py-2 rounded-3xl-3 hover:bg-selva hover:text-perla disabled:opacity-60 transition-colors shrink-0"
              >
                {gps.status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4" />
                )}
                {gps.fix ? 'Actualizar mi ubicacion' : 'Usar mi ubicacion'}
              </button>
            </div>
            {gps.status === 'error' && gps.error && (
              <p className="text-xs text-red-600 mt-2">{gps.error}</p>
            )}
          </div>

          {comparacion && (
            <>
              <RutaRecomendada resultado={comparacion.backtracking} />
              <TablaComparativa resultados={comparacion.todos} />
            </>
          )}
        </>
      )}
    </section>
  );
}

function RutaRecomendada({ resultado }: { resultado: ResultadoBusqueda }) {
  // Explicación con IA — estrictamente bajo demanda para no gastar cuota de la API.
  const [explicando, setExplicando] = useState(false);
  const [explicacion, setExplicacion] = useState<ExplicacionIA | null>(null);
  const [errorIA, setErrorIA] = useState('');

  // Si cambia la ruta recomendada, la explicación previa deja de corresponder.
  useEffect(() => {
    setExplicacion(null);
    setErrorIA('');
  }, [resultado]);

  async function pedirExplicacion(): Promise<void> {
    setExplicando(true);
    setErrorIA('');
    try {
      const payload = {
        totalMetros: Math.round(resultado.costoM),
        respetaPrioridad: resultado.respetaPrioridad,
        orden: resultado.tramos.map((t, i) => ({
          posicion: i + 1,
          reporteId: t.reporte.id,
          gravedad: t.reporte.gravedad,
          metrosDesdeAnterior: Math.round(t.distanciaM),
        })),
      };
      setExplicacion(await explicar('ruta', payload));
    } catch (e) {
      setExplicacion(null);
      setErrorIA(friendlyError(e));
    } finally {
      setExplicando(false);
    }
  }

  return (
    <div data-testid="ruta-recomendada" className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-selva text-perla text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-pill">
          Recomendada
        </span>
        <span className="text-xs text-arena">
          Backtracking · {metros(resultado.costoM)} en total
        </span>
      </div>

      <ol className="space-y-2">
        {resultado.tramos.map((tramo, i) => (
          <li
            key={tramo.reporte.id}
            className="flex items-center gap-3 bg-lienzo border border-arcilla rounded-3xl-2 px-3 py-2.5"
          >
            <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-pill bg-catedral text-perla text-xs font-bold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-tierra">
                  Reporte #{tramo.reporte.id}
                </span>
                <GravedadBadge gravedad={tramo.reporte.gravedad} />
              </div>
              <p className="text-[10px] text-arena mt-0.5">
                {categoriaName(tramo.reporte.categoria_id)} · {metros(tramo.distanciaM)} desde{' '}
                {i === 0 ? 'la Base' : `el #${resultado.tramos[i - 1].reporte.id}`}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4" data-testid="explicador-ia">
        <button
          type="button"
          onClick={pedirExplicacion}
          disabled={explicando}
          data-testid="btn-explicar-ia"
          className="w-full flex items-center justify-center gap-2 bg-lienzo border border-caoba text-caoba font-semibold text-xs min-h-9 px-4 rounded-3xl-3 hover:bg-caoba hover:text-perla disabled:opacity-60 transition-colors"
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
                  cifras que no están en el cálculo ({explicacion.numerosSospechosos.join(', ')}).
                  Revisalas vos antes de usar esta explicación.
                </p>
              </div>
            )}

            <p className="text-[9px] text-arena leading-relaxed px-1">
              Texto generado por IA a partir del cálculo. Es un apoyo: vos decidís tu recorrido.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TablaComparativa({ resultados }: { resultados: ResultadoBusqueda[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ladrillo uppercase tracking-wide mb-2">
        Comparacion de algoritmos
      </h4>
      <div className="overflow-x-auto">
        <table data-testid="tabla-comparativa" className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-arena uppercase tracking-wide">
              <th className="font-semibold py-1.5 pr-2">Algoritmo</th>
              <th className="font-semibold py-1.5 pr-2 text-right">Costo</th>
              <th className="font-semibold py-1.5 pr-2 text-right">Estados</th>
              <th className="font-semibold py-1.5 pr-2 text-center">Optimo</th>
              <th className="font-semibold py-1.5 text-center">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr key={r.algoritmo} className="border-t border-arcilla text-xs text-tierra">
                <td className="py-2 pr-2 font-semibold whitespace-nowrap">{r.algoritmo}</td>
                <td className="py-2 pr-2 text-right whitespace-nowrap">{metros(r.costoM)}</td>
                <td className="py-2 pr-2 text-right">{r.estadosExplorados}</td>
                <td className="py-2 pr-2 text-center">
                  <Marca ok={r.optima} />
                </td>
                <td className="py-2 text-center">
                  <Marca ok={r.respetaPrioridad} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-arena leading-relaxed mt-2">
        <strong className="font-semibold">Optimo</strong> = costo minimo entre los tres.{' '}
        <strong className="font-semibold">Prioridad</strong> = no posterga un reporte de gravedad
        mayor. Backtracking es el recomendado porque es el unico que garantiza el costo minimo entre
        las rutas que respetan la prioridad; si cuesta mas que BFS, es porque BFS llega a su costo
        saltandose una Emergencia.
      </p>
    </div>
  );
}

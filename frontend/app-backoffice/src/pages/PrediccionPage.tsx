import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Eye, Sparkles, TrendingUp } from 'lucide-react';
import {
  getAlertas,
  getComparativa,
  getHistorialDecisiones,
  registrarDecision,
  type AccionRecomendacion,
  type Alerta,
  type Comparativa,
  type HistorialDecisiones,
  type RespuestaAlertas,
} from '../lib/prediccionApi';
import { CATEGORIA_NAMES } from '../lib/categories';
import { friendlyError } from '../lib/errors';
import { ROLES, tieneAlgunRol } from '../lib/areas';
import { useAuthStore } from '../store/authStore';
import { useEsEscritorio } from '../hooks/useEsEscritorio';
import MapaComparativo, { type CapaMapa } from '../components/prediccion/MapaComparativo';
import DecisionModal from '../components/prediccion/DecisionModal';

/**
 * Panel de decision municipal: actual vs. prediccion (ISSUE-32).
 *
 * Regla que atraviesa toda la pantalla: lo observado y lo estimado no comparten
 * color, etiqueta ni contenedor. Lo estimado se marca siempre con el icono de
 * estimacion, el tono Sol Camba y la version del modelo; lo observado con tonos
 * tierra y su periodo. Nunca se muestra un unico numero que sea la mezcla.
 *
 * La autoridad municipal ve el resumen, la comparativa y el historial, pero no
 * la seccion de capacidad y acciones: la decision operativa es del coordinador
 * (mismo criterio que ISSUE-31 aplico a /prediccion/alertas).
 */

/** Maximo de alertas criticas en el resumen ejecutivo (criterio 6). */
const MAXIMO_ALERTAS_RESUMEN = 3;

type Seccion = 'resumen' | 'comparativa' | 'capacidad' | 'historial';

const SECCIONES: { id: Seccion; label: string; soloCoordinador?: boolean }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'comparativa', label: 'Actual vs. prediccion' },
  { id: 'capacidad', label: 'Capacidad y acciones', soloCoordinador: true },
  { id: 'historial', label: 'Historial y precision' },
];

const CAPAS: { id: CapaMapa; label: string }[] = [
  { id: 'observado', label: 'Observado' },
  { id: 'estimado', label: 'Estimado' },
  { id: 'diferencia', label: 'Diferencia' },
];

const ESTADOS_CASO = [
  'PendienteAsignacion',
  'PlanificadoVisita',
  'ValidacionCampo',
  'Reencolado',
  'EnTrabajo',
  'Derivado',
  'RechazadoCampo',
  'Finalizado',
];

function nombreCategoria(id: number | null): string {
  if (id === null) return 'Sin categoria';
  return CATEGORIA_NAMES[id] ?? `Categoria ${id}`;
}

function diaRelativo(dias: number): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Etiqueta reutilizable: de donde viene cada numero de la pantalla. */
function EtiquetaOrigen({ origen }: { origen: 'observacion' | 'estimacion' }) {
  const observado = origen === 'observacion';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        observado ? 'bg-ladrillo/15 text-ladrillo' : 'bg-sol-camba/15 text-sol-camba'
      }`}
    >
      {observado ? <Eye className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      {observado ? 'Observado' : 'Estimacion del modelo'}
    </span>
  );
}

function Tarjeta({
  titulo,
  children,
  extra,
}: {
  titulo: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl-3 border border-arcilla bg-perla p-4 lg:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-tierra">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export default function PrediccionPage() {
  const user = useAuthStore((s) => s.user);
  const esCoordinador = tieneAlgunRol(user?.roles, [ROLES.COORDINADOR_OPERATIVO]);
  const esEscritorio = useEsEscritorio();

  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const [comparativa, setComparativa] = useState<Comparativa | null>(null);
  const [alertas, setAlertas] = useState<RespuestaAlertas | null>(null);
  const [historial, setHistorial] = useState<HistorialDecisiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ultimos 7 dias completos: misma duracion que el pronostico, para que la
  // diferencia por zona sea comparable de entrada (ver periodos_comparables).
  const [desde, setDesde] = useState(() => diaRelativo(-7));
  const [hasta, setHasta] = useState(() => diaRelativo(-1));
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [estado, setEstado] = useState('');
  const [capa, setCapa] = useState<CapaMapa>('diferencia');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);
  const [nivelAlerta, setNivelAlerta] = useState<'todas' | 'apoyo' | 'preventiva'>('todas');

  const [enDecision, setEnDecision] = useState<Alerta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorDecision, setErrorDecision] = useState<string | null>(null);

  const secciones = SECCIONES.filter((s) => esCoordinador || !s.soloCoordinador);

  const cargarHistorial = useCallback(async () => {
    const datos = await getHistorialDecisiones({ limit: 20 });
    setHistorial(datos);
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);

    const peticiones: [Promise<Comparativa>, Promise<RespuestaAlertas | null>, Promise<void>] = [
      getComparativa({ desde, hasta, categoria_id: categoriaId || null, estado: estado || null }),
      // La autoridad municipal no puede pedir alertas: el gateway responde 403.
      esCoordinador ? getAlertas(true) : Promise.resolve(null),
      cargarHistorial(),
    ];

    Promise.all(peticiones)
      .then(([datosComparativa, datosAlertas]) => {
        if (!vigente) return;
        setComparativa(datosComparativa);
        setAlertas(datosAlertas);
      })
      .catch((e) => vigente && setError(friendlyError(e)))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [desde, hasta, categoriaId, estado, esCoordinador, cargarHistorial]);

  const zonasFiltradas = useMemo(() => {
    if (!comparativa) return [];
    if (nivelAlerta === 'todas' || !alertas) return comparativa.zonas;
    const conNivel = new Set(
      alertas.alertas.filter((a) => a.nivel === nivelAlerta).map((a) => a.zona_h3),
    );
    return comparativa.zonas.filter((z) => conNivel.has(z.zona_h3));
  }, [comparativa, alertas, nivelAlerta]);

  const detalleZona = useMemo(
    () => zonasFiltradas.find((z) => z.zona_h3 === zonaSeleccionada) ?? null,
    [zonasFiltradas, zonaSeleccionada],
  );

  const criticas = useMemo(
    () => (alertas?.alertas ?? []).filter((a) => a.nivel !== 'normal'),
    [alertas],
  );

  const confirmarDecision = async (accion: AccionRecomendacion, motivo: string) => {
    if (!enDecision) return;
    setGuardando(true);
    setErrorDecision(null);
    try {
      await registrarDecision({
        zona_h3: enDecision.zona_h3,
        categoria_id: enDecision.categoria_id,
        nivel: enDecision.nivel,
        accion,
        motivo,
        recomendacion_original: enDecision.recomendacion,
        factores: enDecision.factores,
        riesgo: enDecision.riesgo,
        casos_estimados: enDecision.casos_estimados,
        reportes_estimados: enDecision.reportes_estimados,
        confianza: enDecision.confianza,
        version_modelo: comparativa?.estimado?.version_modelo ?? alertas?.version_modelo ?? null,
        version_dataset: comparativa?.estimado?.version_dataset ?? null,
        periodo_desde: comparativa?.estimado?.periodo.desde ?? desde,
        periodo_hasta: comparativa?.estimado?.periodo.hasta ?? hasta,
      });
      setEnDecision(null);
      await cargarHistorial();
    } catch (e) {
      setErrorDecision(friendlyError(e));
    } finally {
      setGuardando(false);
    }
  };

  const estimado = comparativa?.estimado ?? null;

  const filtros = (
    <div className="flex flex-wrap items-end gap-2.5">
      <label className="text-xs text-arena">
        Desde
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="mt-1 block min-h-11 rounded-3xl-2 border border-arcilla bg-perla px-3 py-2 text-sm text-tierra"
        />
      </label>
      <label className="text-xs text-arena">
        Hasta
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="mt-1 block min-h-11 rounded-3xl-2 border border-arcilla bg-perla px-3 py-2 text-sm text-tierra"
        />
      </label>
      <label className="text-xs text-arena">
        Categoria
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : '')}
          className="mt-1 block min-h-11 rounded-3xl-2 border border-arcilla bg-perla px-3 py-2 text-sm text-tierra"
        >
          <option value="">Todas</option>
          {Object.entries(CATEGORIA_NAMES).map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-arena">
        Estado
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="mt-1 block min-h-11 rounded-3xl-2 border border-arcilla bg-perla px-3 py-2 text-sm text-tierra"
        >
          <option value="">Todos</option>
          {ESTADOS_CASO.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </label>
      {esCoordinador && (
        <label className="text-xs text-arena">
          Nivel de alerta
          <select
            value={nivelAlerta}
            onChange={(e) => setNivelAlerta(e.target.value as typeof nivelAlerta)}
            className="mt-1 block min-h-11 rounded-3xl-2 border border-arcilla bg-perla px-3 py-2 text-sm text-tierra"
          >
            <option value="todas">Todos</option>
            <option value="apoyo">Solicitar apoyo</option>
            <option value="preventiva">Preventiva</option>
          </select>
        </label>
      )}
    </div>
  );

  const seccionResumen = (
    <Tarjeta
      titulo="Resumen ejecutivo"
      extra={
        <span className="text-[10px] text-arena">
          {estimado
            ? `Modelo ${estimado.version_modelo} · dataset ${estimado.version_dataset}`
            : 'Sin modelo entrenado'}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-3xl-2 bg-yeso p-3.5">
          <EtiquetaOrigen origen="observacion" />
          <p className="mt-2 text-2xl font-semibold text-tierra">
            {comparativa?.observado.total_casos ?? '—'}
          </p>
          <p className="text-xs text-arena">
            Casos abiertos del {comparativa?.observado.periodo.desde} al{' '}
            {comparativa?.observado.periodo.hasta}
          </p>
        </div>
        <div className="rounded-3xl-2 border border-sol-camba/30 bg-sol-camba/5 p-3.5">
          <EtiquetaOrigen origen="estimacion" />
          <p className="mt-2 text-2xl font-semibold text-tierra">
            {estimado ? estimado.total_casos_estimados : '—'}
          </p>
          <p className="text-xs text-arena">
            {estimado
              ? `Casos esperados del ${estimado.periodo.desde} al ${estimado.periodo.hasta}`
              : (comparativa?.motivo_sin_estimacion ?? 'Sin pronostico disponible')}
          </p>
        </div>
        {esCoordinador && alertas && (
          <>
            <div className="rounded-3xl-2 bg-yeso p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
                Ocupacion actual
              </p>
              <p className="mt-2 text-2xl font-semibold text-tierra">
                {Math.round(alertas.capacidad.ocupacion_actual * 100)}%
              </p>
              <p className="text-xs text-arena">
                {alertas.capacidad.reportes_abiertos} reportes abiertos sobre{' '}
                {alertas.capacidad.capacidad_reportes}
              </p>
            </div>
            <div className="rounded-3xl-2 bg-yeso p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
                Cuadrillas activas
              </p>
              <p className="mt-2 text-2xl font-semibold text-tierra">
                {alertas.capacidad.cuadrillas_activas}
              </p>
              <p className="text-xs text-arena">{alertas.total} alertas vigentes</p>
            </div>
          </>
        )}
      </div>

      {esCoordinador && criticas.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-tierra">
            Alertas criticas ({Math.min(criticas.length, MAXIMO_ALERTAS_RESUMEN)} de{' '}
            {criticas.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {criticas.slice(0, MAXIMO_ALERTAS_RESUMEN).map((alerta) => (
              <li
                key={`${alerta.zona_h3}-${alerta.categoria_id}`}
                className="rounded-3xl-2 border border-sol-camba/30 bg-sol-camba/5 p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sol-camba" />
                  <div className="min-w-0">
                    <p className="text-sm text-tierra">{alerta.recomendacion}</p>
                    <p className="mt-1 text-[10px] text-arena">
                      Riesgo {Math.round(alerta.riesgo * 100)}% &middot; confianza{' '}
                      {alerta.confianza} &middot; {nombreCategoria(alerta.categoria_id)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {criticas.length > MAXIMO_ALERTAS_RESUMEN && (
            <button
              type="button"
              onClick={() => setSeccion('capacidad')}
              className="mt-2 min-h-11 text-xs font-medium text-ladrillo underline"
            >
              Ver las {criticas.length} alertas en Capacidad y acciones
            </button>
          )}
        </div>
      )}
    </Tarjeta>
  );

  const seccionComparativa = (
    <Tarjeta
      titulo="Actual vs. prediccion"
      extra={
        <div className="flex flex-wrap gap-1.5">
          {CAPAS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={capa === id}
              onClick={() => setCapa(id)}
              className={`min-h-11 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                capa === id ? 'bg-catedral text-perla' : 'bg-yeso text-ladrillo hover:bg-arcilla'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {filtros}

      {!estimado && comparativa?.motivo_sin_estimacion && (
        <p className="mt-3 rounded-3xl-2 bg-yeso p-3 text-xs text-ladrillo">
          Se muestra solo lo observado: {comparativa.motivo_sin_estimacion}
        </p>
      )}

      {estimado && comparativa && !comparativa.periodos_comparables.comparables && (
        <p className="mt-3 flex items-start gap-2 rounded-3xl-2 border border-sol-camba/30 bg-sol-camba/5 p-3 text-xs text-ladrillo">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sol-camba" />
          <span>
            {comparativa.periodos_comparables.motivo} Se muestran las dos cifras, pero no su
            diferencia.
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="h-[320px] lg:col-span-3">
          <MapaComparativo
            zonas={zonasFiltradas}
            capa={capa}
            zonaSeleccionada={zonaSeleccionada}
            onSeleccionar={setZonaSeleccionada}
            nombreCategoria={nombreCategoria}
          />
        </div>

        <div className="lg:col-span-2">
          {detalleZona ? (
            <div className="rounded-3xl-2 border border-arcilla bg-yeso p-4">
              <p className="text-xs font-semibold text-tierra">Zona {detalleZona.zona_h3}</p>
              <div className="mt-3 space-y-3">
                <div>
                  <EtiquetaOrigen origen="observacion" />
                  <p className="mt-1 text-xl font-semibold text-tierra">
                    {detalleZona.casos_observados} Casos
                  </p>
                  <p className="text-[10px] text-arena">
                    {comparativa?.observado.periodo.desde} a {comparativa?.observado.periodo.hasta}
                    {detalleZona.categorias_observadas.length > 0 &&
                      ` · ${detalleZona.categorias_observadas.map(nombreCategoria).join(', ')}`}
                  </p>
                </div>
                <div>
                  <EtiquetaOrigen origen="estimacion" />
                  <p className="mt-1 text-xl font-semibold text-tierra">
                    {detalleZona.casos_estimados === null
                      ? 'Sin modelo'
                      : `${detalleZona.casos_estimados} Casos`}
                  </p>
                  <p className="text-[10px] text-arena">
                    {estimado ? `${estimado.periodo.desde} a ${estimado.periodo.hasta}` : '—'}
                    {detalleZona.confianza && ` · confianza ${detalleZona.confianza}`}
                    {detalleZona.categoria_estimada !== null &&
                      ` · ${nombreCategoria(detalleZona.categoria_estimada)}`}
                  </p>
                </div>
                {detalleZona.diferencia !== null && (
                  <div className="border-t border-arcilla pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ladrillo">
                      Diferencia (estimado − observado)
                    </p>
                    <p className="mt-1 text-lg font-semibold text-tierra">
                      {detalleZona.diferencia > 0 ? '+' : ''}
                      {detalleZona.diferencia}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl-2 border border-dashed border-arcilla p-6 text-center text-xs text-arena">
              Tocá una zona del mapa para ver su detalle agregado.
            </div>
          )}
        </div>
      </div>
    </Tarjeta>
  );

  const seccionCapacidad = (
    <Tarjeta titulo="Capacidad y acciones">
      {alertas && (
        <p className="mb-3 text-xs text-arena">
          {alertas.nota} Cuota por zona: {alertas.capacidad.cuota_por_zona} reportes.
        </p>
      )}
      {criticas.length === 0 ? (
        <p className="rounded-3xl-2 bg-yeso p-4 text-sm text-ladrillo">
          Ninguna zona supera el 80% de su cuota de capacidad.
        </p>
      ) : (
        <ul className="space-y-3">
          {criticas
            .filter((a) => nivelAlerta === 'todas' || a.nivel === nivelAlerta)
            .map((alerta) => (
              <li
                key={`${alerta.zona_h3}-${alerta.categoria_id}`}
                className="rounded-3xl-2 border border-arcilla bg-perla p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      alerta.nivel === 'apoyo'
                        ? 'bg-rosa-toborochi/15 text-tierra'
                        : 'bg-sol-camba/15 text-sol-camba'
                    }`}
                  >
                    {alerta.nivel === 'apoyo' ? 'Solicitar apoyo' : 'Preventiva'}
                  </span>
                  <EtiquetaOrigen origen="estimacion" />
                  <span className="text-[10px] text-arena">
                    Zona {alerta.zona_h3} &middot; {nombreCategoria(alerta.categoria_id)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-tierra">{alerta.recomendacion}</p>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ladrillo sm:grid-cols-4">
                  <div>
                    <dt className="text-arena">Casos estimados</dt>
                    <dd className="font-semibold">{alerta.casos_estimados}</dd>
                  </div>
                  <div>
                    <dt className="text-arena">Reportes estimados</dt>
                    <dd className="font-semibold">{alerta.reportes_estimados}</dd>
                  </div>
                  <div>
                    <dt className="text-arena">Cuota de la zona</dt>
                    <dd className="font-semibold">{alerta.cuota_zona}</dd>
                  </div>
                  <div>
                    <dt className="text-arena">Riesgo</dt>
                    <dd className="font-semibold">{Math.round(alerta.riesgo * 100)}%</dd>
                  </div>
                </dl>

                {alerta.factores.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-arena">
                    {alerta.factores.map((factor) => (
                      <li key={factor}>&middot; {factor}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setErrorDecision(null);
                    setEnDecision(alerta);
                  }}
                  className="mt-3 min-h-11 rounded-3xl-3 bg-catedral px-5 py-2.5 text-sm font-semibold text-perla"
                >
                  Decidir
                </button>
              </li>
            ))}
        </ul>
      )}
    </Tarjeta>
  );

  const seccionHistorial = (
    <Tarjeta
      titulo="Historial y precision"
      extra={<span className="text-[10px] text-arena">{historial?.total ?? 0} decisiones</span>}
    >
      {!historial || historial.data.length === 0 ? (
        <p className="rounded-3xl-2 bg-yeso p-4 text-sm text-ladrillo">
          Todavia no se registro ninguna decision.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-arena">
              <tr className="border-b border-arcilla">
                <th className="py-2 pr-3 font-medium">Zona y semana</th>
                <th className="py-2 pr-3 font-medium">Recomendacion</th>
                <th className="py-2 pr-3 font-medium">Decision y motivo</th>
                <th className="py-2 pr-3 font-medium">Estimado</th>
                <th className="py-2 pr-3 font-medium">Observado</th>
                <th className="py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {historial.data.map((decision) => (
                <tr key={decision.id} className="border-b border-arcilla/60 align-top">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-tierra">{decision.zona_h3}</p>
                    <p className="text-arena">
                      {decision.periodo_desde} a {decision.periodo_hasta}
                    </p>
                  </td>
                  <td className="max-w-[220px] py-2.5 pr-3 text-ladrillo">
                    {decision.recomendacion_original}
                  </td>
                  <td className="max-w-[220px] py-2.5 pr-3">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
                        decision.accion === 'Aceptada'
                          ? 'bg-green-100 text-green-800'
                          : decision.accion === 'Modificada'
                            ? 'bg-sol-camba/15 text-sol-camba'
                            : 'bg-rosa-toborochi/15 text-tierra'
                      }`}
                    >
                      {decision.accion}
                    </span>
                    <p className="mt-1 text-ladrillo">{decision.motivo}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-sol-camba">{decision.casos_estimados}</td>
                  <td className="py-2.5 pr-3 text-ladrillo">
                    {decision.precision.estado === 'pendiente' ? (
                      <span className="text-arena">semana en curso</span>
                    ) : (
                      decision.precision.observado
                    )}
                  </td>
                  <td className="py-2.5 font-semibold text-tierra">
                    {decision.precision.estado === 'pendiente' ? (
                      <span className="font-normal text-arena">—</span>
                    ) : (
                      <>
                        {(decision.precision.error ?? 0) > 0 ? '+' : ''}
                        {decision.precision.error}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );

  const contenido: Record<Seccion, React.ReactNode> = {
    resumen: seccionResumen,
    comparativa: seccionComparativa,
    capacidad: seccionCapacidad,
    historial: seccionHistorial,
  };

  if (cargando && !comparativa) {
    return <p className="p-6 text-sm text-arena">Cargando el panel...</p>;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-tierra">
            <TrendingUp className="h-5 w-5 text-ladrillo" />
            Panel de decision
          </h1>
          <p className="text-xs text-arena">
            La prediccion es una estimacion: se muestra siempre separada de lo observado.
          </p>
        </div>
        {estimado && (
          <p className="flex items-center gap-1.5 text-[10px] text-arena">
            <Database className="h-3 w-3" />
            Modelo {estimado.modelo} {estimado.version_modelo} &middot; dataset{' '}
            {estimado.version_dataset}
          </p>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-3xl-2 bg-rosa-toborochi/10 p-3 text-sm text-tierra">
          {error}
        </p>
      )}

      {/* Movil: pestanas, para no perder contexto al hacer scroll infinito.
          Escritorio: todo a la vez, que es la comparacion lado a lado.
          Se elige en JS y no con `hidden lg:block` para montar un solo arbol:
          si no, el mapa se instanciaria dos veces (ver useEsEscritorio). */}
      {esEscritorio ? (
        <div className="space-y-4">
          {secciones.map(({ id }) => (
            <div key={id}>{contenido[id]}</div>
          ))}
        </div>
      ) : (
        <>
          <nav className="flex gap-1.5 overflow-x-auto" aria-label="Secciones del panel">
            {secciones.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-current={seccion === id ? 'page' : undefined}
                onClick={() => setSeccion(id)}
                className={`min-h-11 shrink-0 rounded-pill px-4 py-2 text-xs font-medium transition-colors ${
                  seccion === id ? 'bg-catedral text-perla' : 'bg-yeso text-ladrillo'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div>{contenido[seccion]}</div>
        </>
      )}

      <DecisionModal
        alerta={enDecision}
        periodo={{
          desde: estimado?.periodo.desde ?? desde,
          hasta: estimado?.periodo.hasta ?? hasta,
        }}
        versionModelo={estimado?.version_modelo ?? alertas?.version_modelo ?? null}
        versionDataset={estimado?.version_dataset ?? null}
        guardando={guardando}
        error={errorDecision}
        onCancelar={() => setEnDecision(null)}
        onConfirmar={confirmarDecision}
        nombreCategoria={nombreCategoria}
      />
    </div>
  );
}

import { fetchAPI } from './api';

/**
 * Panel de decision municipal (ISSUE-32).
 *
 * Los tipos separan siempre lo observado de lo estimado. No hay ningun campo
 * que mezcle ambos: si la interfaz necesita una diferencia, la recibe aparte y
 * con los dos numeros originales al lado (criterio 1 de la issue).
 */

export type Origen = 'observacion' | 'estimacion';

export interface CasosObservados {
  origen: 'observacion';
  periodo: { desde: string; hasta: string };
  total_casos: number;
  detalle: Array<{ zona_h3: string; categoria_id: number; casos: number }>;
}

export interface Pronostico {
  origen: 'estimacion';
  periodo: { desde: string | null; hasta: string | null };
  version_modelo: string;
  version_dataset: string;
  modelo: string;
  limitaciones?: string[];
  total_casos_estimados: number;
  detalle: Array<{
    zona_h3: string;
    categoria_id: number;
    casos_estimados: number;
    margen_error: number;
    confianza: string;
  }>;
}

export interface ZonaComparada {
  zona_h3: string;
  casos_observados: number;
  casos_estimados: number | null;
  diferencia: number | null;
  categorias_observadas: number[];
  categoria_estimada: number | null;
  confianza: string | null;
}

export interface Comparativa {
  observado: CasosObservados;
  estimado: Pronostico | null;
  motivo_sin_estimacion: string | null;
  zonas: ZonaComparada[];
}

export interface Alerta {
  zona_h3: string;
  categoria_id: number;
  casos_estimados: number;
  reportes_estimados: number;
  cuota_zona: number;
  riesgo: number;
  nivel: 'apoyo' | 'preventiva' | 'normal';
  confianza: string;
  recomendacion: string;
  factores: string[];
}

export interface RespuestaAlertas {
  version_modelo: string;
  umbrales: Record<string, number>;
  capacidad: {
    cuadrillas_activas: number;
    capacidad_reportes: number;
    reportes_abiertos: number;
    ocupacion_actual: number;
    reportes_por_caso: number;
    zonas_con_demanda: number;
    cuota_por_zona: number;
  };
  total: number;
  por_nivel: { apoyo: number; preventiva: number };
  alertas: Alerta[];
  nota: string;
}

export type AccionRecomendacion = 'Aceptada' | 'Modificada' | 'Descartada';

export interface DecisionRegistrada {
  id: number;
  zona_h3: string;
  categoria_id: number | null;
  nivel: string;
  accion: AccionRecomendacion;
  motivo: string;
  decidido_por_usuario_id: number;
  recomendacion_original: string;
  factores: string[];
  riesgo: number;
  casos_estimados: number;
  confianza: string | null;
  version_modelo: string | null;
  version_dataset: string | null;
  periodo_desde: string;
  periodo_hasta: string;
  creado_en: string;
  precision: {
    estado: 'medida' | 'pendiente';
    observado: number | null;
    error: number | null;
    error_absoluto: number | null;
  };
}

export interface HistorialDecisiones {
  data: DecisionRegistrada[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosComparativa {
  desde?: string;
  hasta?: string;
  categoria_id?: number | null;
  estado?: string | null;
}

function query(parametros: Record<string, string | number | null | undefined>): string {
  const buscador = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== null && valor !== undefined && valor !== '') buscador.set(clave, String(valor));
  }
  const cadena = buscador.toString();
  return cadena ? `?${cadena}` : '';
}

export function getModelo() {
  return fetchAPI<Pronostico & { metricas?: unknown }>('/prediccion/modelo');
}

export function getComparativa(filtros: FiltrosComparativa = {}) {
  return fetchAPI<Comparativa>(`/prediccion/comparativa${query({ ...filtros })}`);
}

export function getAlertas(soloCriticas = true) {
  return fetchAPI<RespuestaAlertas>(
    `/prediccion/alertas${query({ solo_criticas: String(soloCriticas) })}`,
  );
}

export function getHistorialDecisiones(
  filtros: {
    page?: number;
    limit?: number;
    zona?: string;
    accion?: AccionRecomendacion | '';
  } = {},
) {
  return fetchAPI<HistorialDecisiones>(`/prediccion/decisiones${query({ ...filtros })}`);
}

/** El backend atribuye la decision al usuario del token; aca no se manda autor. */
export function registrarDecision(entrada: {
  zona_h3: string;
  categoria_id: number | null;
  nivel: string;
  accion: AccionRecomendacion;
  motivo: string;
  recomendacion_original: string;
  factores: string[];
  riesgo: number;
  casos_estimados: number;
  reportes_estimados: number | null;
  confianza: string | null;
  version_modelo: string | null;
  version_dataset: string | null;
  periodo_desde: string;
  periodo_hasta: string;
}) {
  return fetchAPI<DecisionRegistrada>('/prediccion/decisiones', {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
}

import { fetchAPI } from './api';

export type GravedadValor = 'Baja' | 'Media' | 'Alta' | 'Emergencia';
export type UbicacionSensible = 'ninguna' | 'via_principal' | 'escuela' | 'hospital';
export type Temporada = 'lluvias' | 'seca';
export type BloqueTriaje = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const ETIQUETAS_UBICACION: Record<UbicacionSensible, string> = {
  ninguna: 'Ninguna',
  via_principal: 'Vía principal',
  escuela: 'Escuela',
  hospital: 'Hospital',
};

export const ETIQUETAS_TEMPORADA: Record<Temporada, string> = {
  lluvias: 'Lluvias',
  seca: 'Seca',
};

export interface ReglaDisparada {
  id: string;
  bloque: BloqueTriaje;
  texto: string;
  conclusion: string;
}

export interface HechosTriaje {
  tipo: string;
  temporada: 'lluvias' | 'seca';
  ubicacion_sensible: UbicacionSensible;
  recurrencia: number;
  horas: number;
  palabra_clave_riesgo: boolean;
}

export interface ResultadoTriaje {
  gravedad_sugerida: GravedadValor | null;
  accion: string | null;
  hechos: HechosTriaje;
  traza: ReglaDisparada[];
}

export interface InferirTriajeInput {
  categoria_id: number;
  creado_en: string;
  distancias_cercanas_m: number[];
  ubicacion_sensible: UbicacionSensible;
  palabra_clave_riesgo: boolean;
  /** Pisa el calendario (nov-mar=lluvias) cuando el clima real no coincide. */
  temporada_forzada?: Temporada;
}

/**
 * Sistema experto de triaje — corre en ms-ia (backend/ms-ia/src/triaje).
 * Misma fuente de verdad que usa la herramienta `explicar_triaje` del
 * asistente conversacional, así que no puede divergir de lo que dice el chat.
 */
export function inferirTriaje(input: InferirTriajeInput): Promise<ResultadoTriaje> {
  return fetchAPI<ResultadoTriaje>('/ia/triaje', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface DuplicadoSugerido {
  reporte_id: number;
  es_mismo_problema: boolean;
  justificacion: string;
}

export interface PerteneceAObraSugerido {
  grupo_id: number;
  pertenece: boolean;
  justificacion: string;
}

export interface SugerenciaHechosResultado {
  ubicacion_sensible: UbicacionSensible;
  palabra_clave_riesgo: boolean;
  parece_lluvia: boolean;
  duplicados: DuplicadoSugerido[];
  pertenece_a_obra: PerteneceAObraSugerido | null;
  justificacion_breve: string;
}

/**
 * Botón "Analizar foto": el modelo de visión de Groq mira la foto del reporte
 * (y las de los cercanos, si se pasan) y sugiere los 3 hechos de criterio
 * humano + candidatos a duplicado + si pertenece a una obra activa cercana.
 * Nunca decide la gravedad ni fusiona/asigna nada — el moderador confirma o
 * corrige lo que precarga.
 */
export function sugerenciaHechos(
  reporteId: number,
  nearbyReportIds: number[],
  nearbyGroupIds: number[],
): Promise<SugerenciaHechosResultado> {
  return fetchAPI<SugerenciaHechosResultado>(`/ia/reportes/${reporteId}/sugerencia-hechos`, {
    method: 'POST',
    body: JSON.stringify({
      nearby_report_ids: nearbyReportIds,
      nearby_group_ids: nearbyGroupIds,
    }),
  });
}

import { fetchAPI } from './api';

export type GravedadValor = 'Baja' | 'Media' | 'Alta' | 'Emergencia';
export type UbicacionSensible = 'ninguna' | 'via_principal' | 'escuela' | 'hospital';
export type BloqueTriaje = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const ETIQUETAS_UBICACION: Record<UbicacionSensible, string> = {
  ninguna: 'Ninguna',
  via_principal: 'Vía principal',
  escuela: 'Escuela',
  hospital: 'Hospital',
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

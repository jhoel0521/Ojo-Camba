import { z } from 'zod';
import type { ActualizacionPayload } from './tecnicoApi';

/** Transiciones de estado que un tecnico en campo puede aplicar (HU-08). */
export const ESTADOS_TECNICO = ['EnTrabajo', 'Finalizado'] as const;

// Flujo secuencial obligatorio completo — debe coincidir con
// TRANSICIONES_VALIDAS en backend/ms-admin/src/admin.service.ts. El tecnico
// solo puede aplicar los pasos que caen dentro de ESTADOS_TECNICO; el paso
// Aceptado -> ValidacionEnCampo lo hace el backoffice, no el tecnico.
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  Aceptado: ['ValidacionEnCampo'],
  ValidacionEnCampo: ['EnTrabajo'],
  EnTrabajo: ['Finalizado'],
  Finalizado: [],
};

/** Siguiente(s) estado(s) que el TECNICO puede aplicar desde estadoActual (puede ser []). */
export function siguientesEstadosTecnico(estadoActual: string): string[] {
  const siguientes = TRANSICIONES_VALIDAS[estadoActual] ?? [];
  return siguientes.filter((e) => (ESTADOS_TECNICO as readonly string[]).includes(e));
}

/**
 * Formulario de bitacora diaria del tecnico.
 *
 * `estado_nuevo` es opcional: si se deja vacio, la actualizacion se registra
 * sin transicionar el estado del Caso (criterio de aceptacion HU-05 #1).
 */
export const actualizacionSchema = z.object({
  comentario: z.string().trim().min(1, 'El comentario es obligatorio'),
  recursos_solicitados: z.string().trim().optional(),
  fecha_estimada_fin: z.string().trim().optional(),
  estado_nuevo: z.union([z.enum(ESTADOS_TECNICO), z.literal('')]).optional(),
});

export type ActualizacionForm = z.infer<typeof actualizacionSchema>;

export interface GpsFix {
  lat: number;
  lng: number;
}

/**
 * Construye el payload para POST /admin/groups/:id/updates a partir del
 * formulario, el usuario y (opcionalmente) una correccion GPS y una foto
 * de avance capturada en base64.
 *
 * Reglas:
 * - `estado_nuevo` solo se envia si el tecnico eligio explicitamente una
 *   transicion (EnTrabajo o Finalizado); en blanco no cambia el estado.
 * - Los campos opcionales vacios se omiten, no se mandan como cadena vacia.
 * - lat/lng solo se incluyen si hay una lectura GPS capturada.
 */
export function buildActualizacionPayload(
  usuario_id: number,
  form: ActualizacionForm,
  gps?: GpsFix | null,
  imagenBase64?: string | null,
): ActualizacionPayload {
  const payload: ActualizacionPayload = {
    usuario_id,
    comentario: form.comentario.trim(),
  };

  const recursos = form.recursos_solicitados?.trim();
  if (recursos) payload.recursos_solicitados = recursos;

  const fecha = form.fecha_estimada_fin?.trim();
  if (fecha) payload.fecha_estimada_fin = fecha;

  if (form.estado_nuevo) payload.estado_nuevo = form.estado_nuevo;

  if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
    payload.lat_actualizada = gps.lat;
    payload.lng_actualizada = gps.lng;
  }

  if (imagenBase64) payload.url_imagen = imagenBase64;

  return payload;
}

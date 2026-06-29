import { z } from 'zod';
import type { ActualizacionPayload } from './tecnicoApi';

/**
 * Formulario de bitacora diaria del tecnico.
 *
 * A diferencia del backoffice, el tecnico NO cambia el estado del Caso:
 * el formulario no expone `estado_nuevo`, por lo que la actualizacion
 * se registra sin transicionar el estado (criterio de aceptacion #1).
 */
export const actualizacionSchema = z.object({
  comentario: z.string().trim().min(1, 'El comentario es obligatorio'),
  recursos_solicitados: z.string().trim().optional(),
  fecha_estimada_fin: z.string().trim().optional(),
});

export type ActualizacionForm = z.infer<typeof actualizacionSchema>;

export interface GpsFix {
  lat: number;
  lng: number;
}

/**
 * Construye el payload para POST /admin/groups/:id/updates a partir del
 * formulario, el usuario y (opcionalmente) una correccion GPS.
 *
 * Reglas:
 * - `estado_nuevo` nunca se envia (el tecnico no cambia el estado).
 * - Los campos opcionales vacios se omiten, no se mandan como cadena vacia.
 * - lat/lng solo se incluyen si hay una lectura GPS capturada.
 */
export function buildActualizacionPayload(
  usuario_id: number,
  form: ActualizacionForm,
  gps?: GpsFix | null,
): ActualizacionPayload {
  const payload: ActualizacionPayload = {
    usuario_id,
    comentario: form.comentario.trim(),
  };

  const recursos = form.recursos_solicitados?.trim();
  if (recursos) payload.recursos_solicitados = recursos;

  const fecha = form.fecha_estimada_fin?.trim();
  if (fecha) payload.fecha_estimada_fin = fecha;

  if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
    payload.lat_actualizada = gps.lat;
    payload.lng_actualizada = gps.lng;
  }

  return payload;
}

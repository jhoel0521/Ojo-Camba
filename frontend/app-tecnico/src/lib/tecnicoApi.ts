import { fetchAPI } from './api';

export interface GrupoReporte {
  id: number;
  codigo_obra: string;
  estado_actual: string;
  fecha_estimada_fin: string | null;
  creado_por_usuario_id: number;
  categoria_id: number | null;
  creado_en: string;
  total_reportes?: number;
  preview_imagen?: string;
}

export interface Actualizacion {
  id: number;
  grupo_id: number;
  usuario_id: number;
  comentario: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  url_imagen: string | null;
  recursos_solicitados: string | null;
  fecha_estimada_fin: string | null;
  lat_actualizada: number | null;
  lng_actualizada: number | null;
  creado_en: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Payload aceptado por POST /admin/groups/:id/updates */
export interface ActualizacionPayload {
  usuario_id: number;
  comentario: string;
  estado_nuevo?: string;
  recursos_solicitados?: string;
  fecha_estimada_fin?: string;
  lat_actualizada?: number;
  lng_actualizada?: number;
  url_imagen?: string;
}

export async function listGroups(
  page = 1,
  limit = 20,
  estado?: string,
): Promise<PaginatedResponse<GrupoReporte>> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (estado) q.set('estado', estado);
  return fetchAPI<PaginatedResponse<GrupoReporte>>(`/admin/groups?${q.toString()}`);
}

export async function listGroupsNearby(
  lat: number,
  lng: number,
  radiusM = 300,
): Promise<GrupoReporte[]> {
  return fetchAPI<GrupoReporte[]>(`/admin/groups/nearby?lat=${lat}&lng=${lng}&radius=${radiusM}`);
}

export async function getGroup(id: number): Promise<GrupoReporte> {
  return fetchAPI<GrupoReporte>(`/admin/groups/${id}`);
}

export async function getCaseTimeline(id: number): Promise<Actualizacion[]> {
  return fetchAPI<Actualizacion[]>(`/admin/groups/${id}/timeline`);
}

export async function addActualizacion(grupo_id: number, payload: ActualizacionPayload) {
  return fetchAPI<{
    id: number;
    grupo_id: number;
    estado_nuevo: string | null;
    comentario: string;
    creado_en: string;
  }>(`/admin/groups/${grupo_id}/updates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

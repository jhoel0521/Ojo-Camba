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

/** Reporte individual dentro de un Caso de Obra (GET /admin/groups/:id/reports). */
export interface ReporteDeGrupo {
  id: number;
  categoria_id: number;
  grupo_id: number | null;
  estado: string;
  gravedad: string;
  lat: number;
  lng: number;
  url_imagen: string | null;
  device_id: string;
  creado_en: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface VisitaCaso {
  id: number;
  grupo_id: number;
  cuadrilla_id: number;
  tecnico_id: number | null;
  fecha_planificada: string | null;
  orden_ruta: number | null;
  llegada_en: string | null;
  cerrada_en: string | null;
  caso: GrupoReporte | null;
}

export interface ContextoOperativo {
  roles: string[];
  es_responsable: boolean;
  cuadrillas: Array<{ cuadrilla_id: number; es_responsable: boolean }>;
}

export interface DetalleVisita {
  visita: VisitaCaso;
  caso: GrupoReporte;
  agrupacion: { total_reportes: number; reportes: ReporteDeGrupo[] };
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
  return fetchAPI<PaginatedResponse<GrupoReporte>>(`/operacion/tecnico/groups?${q.toString()}`);
}

export async function listGroupsNearby(
  lat: number,
  lng: number,
  radiusM = 300,
): Promise<GrupoReporte[]> {
  return fetchAPI<GrupoReporte[]>(
    `/operacion/tecnico/groups/nearby?lat=${lat}&lng=${lng}&radius=${radiusM}`,
  );
}

export async function getGroup(id: number): Promise<GrupoReporte> {
  return fetchAPI<GrupoReporte>(`/operacion/tecnico/groups/${id}`);
}

export async function getGroupReports(id: number): Promise<ReporteDeGrupo[]> {
  return fetchAPI<ReporteDeGrupo[]>(`/admin/groups/${id}/reports`);
}

export async function getCaseTimeline(id: number): Promise<Actualizacion[]> {
  return fetchAPI<Actualizacion[]>(`/operacion/tecnico/groups/${id}/timeline`);
}

export async function addActualizacion(grupo_id: number, payload: ActualizacionPayload) {
  return fetchAPI<{
    id: number;
    grupo_id: number;
    estado_nuevo: string | null;
    comentario: string;
    creado_en: string;
  }>(`/operacion/tecnico/groups/${grupo_id}/updates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registrarDerivacion(
  grupo_id: number,
  payload: { entidad_destino: string; motivo: string; evidencia_url: string },
) {
  return fetchAPI<{ id: number; entidad_destino: string; creado_en: string }>(
    `/operacion/tecnico/groups/${grupo_id}/derivaciones`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function getContextoOperativo(): Promise<ContextoOperativo> {
  return fetchAPI<ContextoOperativo>('/operacion/contexto');
}

export function listMisObras(page = 1, limit = 20): Promise<PaginatedResponse<VisitaCaso>> {
  return fetchAPI<PaginatedResponse<VisitaCaso>>(
    `/operacion/mis-obras?page=${page}&limit=${limit}`,
  );
}

export function listMiRuta(fecha: string): Promise<PaginatedResponse<VisitaCaso>> {
  return fetchAPI<PaginatedResponse<VisitaCaso>>(`/operacion/mi-ruta?fecha=${fecha}`);
}

export function getVisita(id: number): Promise<DetalleVisita> {
  return fetchAPI<DetalleVisita>(`/operacion/visitas/${id}`);
}

export function registrarLlegadaVisita(id: number, lat: number, lng: number): Promise<VisitaCaso> {
  return fetchAPI<VisitaCaso>(`/operacion/visitas/${id}/llegada`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
}

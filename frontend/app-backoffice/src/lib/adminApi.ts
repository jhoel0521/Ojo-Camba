import { fetchAPI } from './api';

export interface PendingReport {
  id: number;
  device_id: string;
  categoria_id: number;
  estado: string;
  gravedad: string;
  url_imagen: string;
  h3_res_8: string;
  h3_res_11: string;
  h3_res_13: string;
  lat: number;
  lng: number;
  creado_en: string;
  grupo_id: number | null;
}

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
  estado_nuevo: string | null;
  url_imagen: string | null;
  recursos_solicitados: string | null;
  fecha_estimada_fin: string | null;
  lat_actualizada: number | null;
  lng_actualizada: number | null;
  creado_en: string;
}

export interface DashboardStats {
  pendientes: number;
  aceptados_hoy: number;
  casos_activos: number;
  dispositivos_baneados: number;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  puntos: number;
  nivel_id: number | null;
  roles: string[];
  creado_en: string;
}

export interface Dispositivo {
  device_id: string;
  is_banned: boolean;
  motivo_ban: string | null;
  ultimo_uso: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export async function getDashboard(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>('/admin/dashboard');
}

export async function listPending(page = 1, limit = 20): Promise<PaginatedResponse<PendingReport>> {
  return fetchAPI<PaginatedResponse<PendingReport>>(
    `/admin/reports/pending?page=${page}&limit=${limit}`,
  );
}

export async function acceptReport(
  id: number,
  moderador_id: number,
  categoria_id?: number,
  grupo_id?: number,
): Promise<{ id: number; estado: string; grupo_id: number; codigo_obra: string }> {
  return fetchAPI(`/admin/reports/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ moderador_id, categoria_id, grupo_id }),
  });
}

export async function listNearbyGroups(h3_cell: string): Promise<GrupoReporte[]> {
  const res = await fetchAPI<GrupoReporte[] | { data: GrupoReporte[] }>(
    `/admin/groups/by-cell?h3_cell=${encodeURIComponent(h3_cell)}&h3_resolution=11`,
  );
  return Array.isArray(res) ? res : ((res as { data: GrupoReporte[] }).data ?? []);
}

export async function rejectReport(id: number): Promise<{ id: number; estado: string }> {
  return fetchAPI(`/admin/reports/${id}/reject`, { method: 'POST' });
}

export async function createGroup(report_ids: number[], creado_por_usuario_id: number) {
  return fetchAPI<{ id: number; codigo_obra: string; reportes_agrupados: number }>(
    '/admin/groups',
    {
      method: 'POST',
      body: JSON.stringify({ report_ids, creado_por_usuario_id }),
    },
  );
}

export async function listGroups(page = 1, limit = 20): Promise<PaginatedResponse<GrupoReporte>> {
  return fetchAPI<PaginatedResponse<GrupoReporte>>(`/admin/groups?page=${page}&limit=${limit}`);
}

export async function getGroup(id: number): Promise<GrupoReporte> {
  return fetchAPI<GrupoReporte>(`/admin/groups/${id}`);
}

export async function getCaseTimeline(id: number): Promise<Actualizacion[]> {
  return fetchAPI<Actualizacion[]>(`/admin/groups/${id}/timeline`);
}

export async function updateCase(
  grupo_id: number,
  dto: {
    usuario_id: number;
    comentario: string;
    estado_nuevo?: string;
    recursos_solicitados?: string;
    fecha_estimada_fin?: string;
    lat_actualizada?: number;
    lng_actualizada?: number;
    url_imagen?: string;
  },
) {
  return fetchAPI(`/admin/groups/${grupo_id}/updates`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function listReportesByGrupo(grupo_id: number, limit = 6): Promise<PendingReport[]> {
  const res = await fetchAPI<PaginatedResponse<PendingReport>>(
    `/reportes?grupo_id=${grupo_id}&limit=${limit}`,
  );
  return res.data ?? [];
}

export async function banDevice(device_id: string, motivo: string) {
  return fetchAPI('/admin/devices/ban', {
    method: 'POST',
    body: JSON.stringify({ device_id, motivo }),
  });
}

export async function listUsers(page = 1, limit = 20): Promise<PaginatedResponse<Usuario>> {
  return fetchAPI<PaginatedResponse<Usuario>>(`/auth/users?page=${page}&limit=${limit}`);
}

export async function listDevices(
  page = 1,
  limit = 20,
  bannedOnly = false,
): Promise<PaginatedResponse<Dispositivo>> {
  const banned = bannedOnly ? '&banned_only=true' : '';
  return fetchAPI<PaginatedResponse<Dispositivo>>(
    `/admin/devices?page=${page}&limit=${limit}${banned}`,
  );
}

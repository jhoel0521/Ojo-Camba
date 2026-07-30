import { fetchAPI } from './api';

export interface CiudadanoGestionable {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
  creado_en: string;
}

export interface RolGestionable {
  nombre: string;
  obligatorio: boolean;
  gestionable: boolean;
}

export interface SolicitudTi {
  id: number;
  tipo: string;
  referencia_carta: string;
  comentario: string | null;
  ejecutado_por_usuario_id: number;
  resultado: string;
  cuadrilla_id: number | null;
  creado_en: string;
  usuarios: Array<{
    usuario_id: number;
    roles_antes: string[];
    roles_despues: string[];
    participacion_cuadrilla: string | null;
  }>;
}

export interface SolicitudTiPayload {
  tipo: 'alta' | 'cambio' | 'baja' | 'conformacion_cuadrilla';
  referencia_carta: string;
  comentario?: string;
  cambios: Array<{ usuario_id: number; roles: string[] }>;
  cuadrilla?: {
    cuadrilla_id?: number;
    nombre?: string;
    especialidad_id?: number | null;
    responsable_usuario_id: number;
    miembro_usuario_ids: number[];
  };
}

interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function listCiudadanos(page = 1, limit = 20, q?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) params.set('q', q);
  return fetchAPI<Paginado<CiudadanoGestionable>>(`/administracion/ciudadanos?${params}`);
}

export function listRolesGestionables() {
  return fetchAPI<RolGestionable[]>('/administracion/roles');
}

export function registrarSolicitudTi(payload: SolicitudTiPayload) {
  return fetchAPI<SolicitudTi>('/administracion/solicitudes-ti', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listSolicitudesTi(page = 1, limit = 5) {
  return fetchAPI<Paginado<SolicitudTi>>(
    `/administracion/solicitudes-ti?page=${page}&limit=${limit}`,
  );
}

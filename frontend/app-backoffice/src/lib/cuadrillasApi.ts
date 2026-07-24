import { fetchAPI } from './api';

/**
 * Cliente de la feature de cuadrillas. El CRUD y la asignación viven en ms-admin
 * (dueño del ciclo de vida del Caso de Obra) y la recomendación en ms-ia, pero
 * desde el backoffice es una sola pantalla — por eso ambos llamados están acá.
 * Tipos de wire propios, sin importar @ojo-camba/common (arrastraría TypeORM al
 * bundle; misma convención que triajeApi.ts).
 */

export interface Especialidad {
  id: number;
  nombre: string;
  categoria_id: number | null;
}

export interface Cuadrilla {
  id: number;
  nombre: string;
  activa: boolean;
  especialidad_id: number | null;
  especialidad_nombre: string | null;
  especialidad_categoria_id: number | null;
  /** Casos de Obra sin finalizar que ya tiene asignados. */
  casos_activos: number;
}

export interface ReglaRecomendacion {
  id: string;
  bloque: 'especialidad' | 'carga' | 'disponibilidad';
  texto: string;
  conclusion: string;
}

export interface CuadrillaPuntuada {
  cuadrilla_id: number;
  nombre: string;
  especialidad_nombre: string | null;
  casos_activos: number;
  puntaje: number;
  motivos: string[];
}

export interface RecomendacionCuadrilla {
  grupo_id: number;
  codigo_obra: string;
  categoria_id: number | null;
  cuadrilla_actual: { id: number; nombre: string | null } | null;
  recomendada: CuadrillaPuntuada | null;
  ranking: CuadrillaPuntuada[];
  traza: ReglaRecomendacion[];
  nota: string;
}

export function listCuadrillas(soloActivas = false): Promise<Cuadrilla[]> {
  const qs = soloActivas ? '?solo_activas=true' : '';
  return fetchAPI<Cuadrilla[]>(`/admin/cuadrillas${qs}`);
}

export function listEspecialidades(): Promise<Especialidad[]> {
  return fetchAPI<Especialidad[]>('/admin/especialidades');
}

export function createCuadrilla(nombre: string, especialidad_id?: number): Promise<Cuadrilla> {
  return fetchAPI<Cuadrilla>('/admin/cuadrillas', {
    method: 'POST',
    body: JSON.stringify({ nombre, especialidad_id }),
  });
}

export function updateCuadrilla(
  id: number,
  cambios: { nombre?: string; especialidad_id?: number | null; activa?: boolean },
): Promise<Cuadrilla> {
  return fetchAPI<Cuadrilla>(`/admin/cuadrillas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export interface AsignacionResultado {
  grupo_id: number;
  codigo_obra: string;
  cuadrilla_id: number | null;
  cuadrilla_nombre: string | null;
  actualizacion_id: number;
}

/** `cuadrilla_id: null` desasigna. Queda registrado en la bitácora del caso. */
export function asignarCuadrilla(
  grupoId: number,
  cuadrilla_id: number | null,
  usuario_id: number,
): Promise<AsignacionResultado> {
  return fetchAPI<AsignacionResultado>(`/admin/groups/${grupoId}/cuadrilla`, {
    method: 'POST',
    body: JSON.stringify({ cuadrilla_id, usuario_id }),
  });
}

/**
 * Score explicable de ms-ia (especialidad + carga actual), no un LLM: devuelve
 * el ranking completo y la traza de reglas para que el moderador vea el porqué.
 */
export function recomendarCuadrilla(grupoId: number): Promise<RecomendacionCuadrilla> {
  return fetchAPI<RecomendacionCuadrilla>(`/ia/casos/${grupoId}/recomendar-cuadrilla`, {
    method: 'POST',
  });
}

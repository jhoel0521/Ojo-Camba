/** Roles globales vigentes en la operación municipal.
 *
 * `responsable de cuadrilla` no aparece aquí porque es una responsabilidad
 * dentro de una cuadrilla, modelada por CuadrillaMiembro.es_responsable.
 */
export const ROLES = {
  CIUDADANO: 'ciudadano',
  BACKOFFICE: 'backoffice',
  TECNICO: 'tecnico',
  COORDINADOR_OPERATIVO: 'coordinador_operativo',
  ENCARGADO_IT: 'encargado_it',
  AUTORIDAD_MUNICIPAL: 'autoridad_municipal',
} as const;

export type RolNombre = (typeof ROLES)[keyof typeof ROLES];

/**
 * Equivalencias temporales para no invalidar cuentas existentes durante la
 * migración. Las nuevas asignaciones siempre usan los roles vigentes.
 */
export const ROL_COMPATIBILIDAD: Record<string, RolNombre> = {
  moderador: ROLES.BACKOFFICE,
  admin: ROLES.ENCARGADO_IT,
};

export function normalizarRol(rol: string): string {
  return ROL_COMPATIBILIDAD[rol] ?? rol;
}

export function tieneAlgunRol(roles: string[], requeridos: readonly string[]): boolean {
  const normalizados = roles.map(normalizarRol);
  return requeridos.some((rol) => normalizados.includes(rol));
}

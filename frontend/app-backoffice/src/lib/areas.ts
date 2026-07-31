/**
 * Areas del Backoffice y permisos por ruta (ISSUE-30).
 *
 * Fuente unica de la autorizacion del cliente: el guard de rutas, el menu
 * lateral, el selector de area y la redireccion post-login leen de aca, para
 * que no vuelvan a divergir como pasaba con las listas sueltas de roles en
 * AuthGuard, Layout y LoginPage.
 *
 * Los roles espejan libs/common/src/auth/roles.ts sin importar
 * @ojo-camba/common (arrastraria TypeORM al bundle, misma razon que
 * cuadrillasApi.ts). Si alla se agrega un rol, hay que reflejarlo aca.
 *
 * OJO: esto es UX, no seguridad. La autorizacion real vive en el gateway
 * (401/403); aca solo evitamos mostrar accesos que el backend va a rechazar.
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

/** Equivalencias transitorias para las cuentas creadas antes de ISSUE-26. */
const ROL_COMPATIBILIDAD: Record<string, RolNombre> = {
  moderador: ROLES.BACKOFFICE,
  admin: ROLES.ENCARGADO_IT,
};

export function normalizarRol(rol: string): string {
  return ROL_COMPATIBILIDAD[rol] ?? rol;
}

export function normalizarRoles(roles: string[] | undefined): string[] {
  return (roles ?? []).map(normalizarRol);
}

export function tieneAlgunRol(roles: string[] | undefined, requeridos: readonly string[]): boolean {
  const normalizados = normalizarRoles(roles);
  return requeridos.some((rol) => normalizados.includes(rol));
}

export interface Area {
  id: string;
  label: string;
  descripcion: string;
  ruta: string;
  roles: readonly string[];
}

/**
 * Area INICIAL de cada perfil (ISSUE-30): donde aterriza al entrar y que se
 * ofrece en el selector cuando tiene varios roles.
 *
 * Ojo con la diferencia: `roles` aca es "de quien es esta area", no "quien
 * puede entrar". El coordinador y el encargado de IT consultan el tablero
 * estrategico (ver PERMISOS_RUTA y la matriz de ISSUE-26) pero su area propia
 * es otra, asi que con un solo rol entran directo a la suya en vez de que les
 * aparezca un selector.
 */
export const AREAS: readonly Area[] = [
  {
    id: 'bandeja',
    label: 'Bandeja prioritaria',
    descripcion: 'Revisar reportes ciudadanos pendientes y resolverlos.',
    ruta: '/revisar',
    roles: [ROLES.BACKOFFICE],
  },
  {
    id: 'operacion',
    label: 'Operacion y cuadrillas',
    descripcion: 'Casos de obra, prioridades, retrasos y asignacion de cuadrillas.',
    ruta: '/casos',
    roles: [ROLES.COORDINADOR_OPERATIVO],
  },
  {
    id: 'accesos',
    label: 'Usuarios y solicitudes',
    descripcion: 'Cuentas, roles, conformacion de cuadrillas y solicitudes de TI.',
    ruta: '/accesos',
    roles: [ROLES.ENCARGADO_IT],
  },
  {
    id: 'estrategico',
    label: 'Panel estrategico',
    descripcion: 'Indicadores de gestion municipal y evolucion de los casos.',
    ruta: '/',
    roles: [ROLES.AUTORIDAD_MUNICIPAL],
  },
];

/**
 * Permisos por ruta, derivados de la matriz de docs/ISSUE-26-matriz-permisos.md.
 * El primer patron que coincide decide; una ruta sin patron queda accesible
 * para cualquier sesion valida (ej. la pagina de seleccion de area).
 */
const PERMISOS_RUTA: readonly { patron: RegExp; roles: readonly string[] }[] = [
  // "Consultar tablero estrategico": coordinador, encargado IT y autoridad.
  {
    patron: /^\/$/,
    roles: [ROLES.AUTORIDAD_MUNICIPAL, ROLES.COORDINADOR_OPERATIVO, ROLES.ENCARGADO_IT],
  },
  // Panel de decision (ISSUE-32): quien decide y quien consulta el agregado.
  // La autoridad entra, pero adentro no ve la seccion de capacidad y acciones
  // ni puede decidir: eso lo comprueba el gateway, aca solo se abre la ruta.
  {
    patron: /^\/prediccion(\/|$)/,
    roles: [ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL],
  },
  // "Aceptar/rechazar bandeja": solo Backoffice.
  { patron: /^\/revisar(\/|$)/, roles: [ROLES.BACKOFFICE] },
  // "Ver/actualizar casos" y "priorizar/reasignar cuadrilla": coordinador.
  { patron: /^\/(casos|grupos)(\/|$)/, roles: [ROLES.COORDINADOR_OPERATIVO] },
  // "Gestionar usuarios, roles y umbrales": encargado IT.
  { patron: /^\/(usuarios|accesos)(\/|$)/, roles: [ROLES.ENCARGADO_IT] },
  { patron: /^\/configuracion(\/|$)/, roles: [ROLES.ENCARGADO_IT] },
];

export function puedeEntrar(ruta: string, roles: string[] | undefined): boolean {
  const regla = PERMISOS_RUTA.find((r) => r.patron.test(ruta));
  return regla ? tieneAlgunRol(roles, regla.roles) : true;
}

export function areasDisponibles(roles: string[] | undefined): Area[] {
  return AREAS.filter((area) => tieneAlgunRol(roles, area.roles));
}

/** Un tecnico sin rol de gestion trabaja en app-tecnico, no aca. */
export function tieneAccesoAlBackoffice(roles: string[] | undefined): boolean {
  return areasDisponibles(roles).length > 0;
}

const AREA_RECORDADA_KEY = 'ojo_camba_area';

export function recordarArea(areaId: string): void {
  try {
    localStorage.setItem(AREA_RECORDADA_KEY, areaId);
  } catch {
    /* almacenamiento bloqueado: se pierde la preferencia, no el acceso */
  }
}

export function olvidarArea(): void {
  try {
    localStorage.removeItem(AREA_RECORDADA_KEY);
  } catch {
    /* idem */
  }
}

function areaRecordada(roles: string[] | undefined): Area | null {
  let id: string | null = null;
  try {
    id = localStorage.getItem(AREA_RECORDADA_KEY);
  } catch {
    return null;
  }
  if (!id) return null;
  return areasDisponibles(roles).find((area) => area.id === id) ?? null;
}

/**
 * Destino tras iniciar sesion:
 *   - la ultima area elegida, si sigue permitida;
 *   - la unica area del perfil, si tiene una sola;
 *   - null cuando hay varias y toca elegir (ver /areas).
 */
export function areaInicial(roles: string[] | undefined): Area | null {
  const recordada = areaRecordada(roles);
  if (recordada) return recordada;

  const disponibles = areasDisponibles(roles);
  return disponibles.length === 1 ? disponibles[0] : null;
}

/** Ruta a la que mandar al usuario despues de autenticarse. */
export function rutaInicial(roles: string[] | undefined): string {
  return areaInicial(roles)?.ruta ?? '/areas';
}

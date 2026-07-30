export const META_VISITAS_DIARIAS = 5;
export const UMBRAL_ALERTA_CARGA = 8;
export const UMBRAL_MAXIMO_CARGA = 10;

export interface EstadoCapacidad {
  visitasPermitidas: number;
  alertaPreventiva: boolean;
  requiereApoyo: boolean;
  admiteAsignacion: boolean;
}

export function evaluarCapacidad(cargaActual: number, reportesEntrantes: number): EstadoCapacidad {
  const proyeccion = cargaActual + reportesEntrantes;
  return {
    visitasPermitidas: META_VISITAS_DIARIAS,
    alertaPreventiva: proyeccion >= UMBRAL_ALERTA_CARGA,
    requiereApoyo: proyeccion >= UMBRAL_MAXIMO_CARGA,
    admiteAsignacion: proyeccion <= UMBRAL_MAXIMO_CARGA,
  };
}

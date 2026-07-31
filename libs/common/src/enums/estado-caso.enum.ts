/**
 * Estados operativos de un Caso de Obra una vez que Backoffice ya lo validó.
 *
 * No se reutiliza EstadoReporte: un reporte ciudadano puede ser rechazado antes
 * de agruparse, mientras que este flujo describe el trabajo de campo del Caso.
 */
export enum EstadoCaso {
  PendienteAsignacion = 'PendienteAsignacion',
  PlanificadoVisita = 'PlanificadoVisita',
  ValidacionCampo = 'ValidacionCampo',
  Reencolado = 'Reencolado',
  EnTrabajo = 'EnTrabajo',
  Derivado = 'Derivado',
  RechazadoCampo = 'RechazadoCampo',
  Finalizado = 'Finalizado',
}

/** Fuente única del flujo aprobado para ISSUE-29. */
export const TRANSICIONES_CASO: Readonly<Record<EstadoCaso, readonly EstadoCaso[]>> = {
  [EstadoCaso.PendienteAsignacion]: [EstadoCaso.PlanificadoVisita],
  [EstadoCaso.PlanificadoVisita]: [EstadoCaso.ValidacionCampo],
  [EstadoCaso.ValidacionCampo]: [
    EstadoCaso.Reencolado,
    EstadoCaso.EnTrabajo,
    EstadoCaso.Derivado,
    EstadoCaso.RechazadoCampo,
  ],
  [EstadoCaso.Reencolado]: [EstadoCaso.PlanificadoVisita],
  [EstadoCaso.EnTrabajo]: [EstadoCaso.PlanificadoVisita, EstadoCaso.Finalizado],
  [EstadoCaso.Derivado]: [],
  [EstadoCaso.RechazadoCampo]: [],
  [EstadoCaso.Finalizado]: [],
};

export const ESTADOS_CASO_TERMINALES: readonly EstadoCaso[] = [
  EstadoCaso.Derivado,
  EstadoCaso.RechazadoCampo,
  EstadoCaso.Finalizado,
];

export function puedeTransicionarCaso(desde: EstadoCaso, hasta: EstadoCaso): boolean {
  return TRANSICIONES_CASO[desde]?.includes(hasta) ?? false;
}

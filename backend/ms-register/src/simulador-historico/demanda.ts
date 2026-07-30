import { Azar } from './azar';
import { DemandaDia, ParametrosSimulador } from './domain';

export const MESES_LLUVIOSOS_SANTA_CRUZ = new Set([11, 12, 1, 2, 3]);

export function demandaDelDia(
  fecha: Date,
  parametros: ParametrosSimulador,
  azar: Azar,
): DemandaDia {
  const diasTotales = Math.max(
    1,
    Math.floor((parametros.hoy.getTime() - parametros.inicio.getTime()) / 86_400_000),
  );
  const diaActual = Math.max(
    0,
    Math.floor((fecha.getTime() - parametros.inicio.getTime()) / 86_400_000),
  );
  const progreso = Math.min(1, diaActual / diasTotales);
  const lluvioso = MESES_LLUVIOSOS_SANTA_CRUZ.has(fecha.getMonth() + 1);
  const base = 12 + progreso * 68;
  const estacional = lluvioso ? 1.25 : 0.78;
  const variacion = azar.entero(-5, 5);
  const cantidad = Math.max(
    5,
    Math.min(parametros.maxReportesDia, Math.round(base * estacional + variacion)),
  );
  return { cantidad, lluvioso };
}

export interface AsignacionJornadaDemo {
  ordenRuta: number;
  emailTecnico: string;
}

const TECNICOS_DEMO = [
  'jefe.cuadrilla@ojocamba.bo',
  'tecnico.1@ojocamba.bo',
  'tecnico.2@ojocamba.bo',
];

/** Distribución fija para que la feria sea repetible y fácil de explicar. */
export function construirAsignacionesJornadaDemo(totalCasos: number): AsignacionJornadaDemo[] {
  return Array.from({ length: totalCasos }, (_, indice) => ({
    ordenRuta: indice + 1,
    emailTecnico: TECNICOS_DEMO[indice % TECNICOS_DEMO.length],
  }));
}

export function validarFechaJornada(valor: string | undefined): string {
  const fecha = valor ?? new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime())
  ) {
    throw new Error('Usa --fecha YYYY-MM-DD, por ejemplo --fecha 2026-07-30.');
  }
  return fecha;
}

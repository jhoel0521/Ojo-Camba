import { Azar } from './azar';
import { demandaDelDia } from './demanda';
import { ParametrosSimulador } from './domain';

const parametros: ParametrosSimulador = {
  inicio: new Date('2021-01-01T00:00:00.000Z'),
  hoy: new Date('2026-01-01T00:00:00.000Z'),
  semilla: 'prueba',
  ritmoMs: 0,
  maxReportesDia: 100,
};

describe('demanda histórica', () => {
  it('es reproducible y nunca supera 100 reportes diarios', () => {
    const fecha = new Date('2025-12-01T00:00:00.000Z');
    const primera = demandaDelDia(fecha, parametros, new Azar('feria'));
    const segunda = demandaDelDia(fecha, parametros, new Azar('feria'));

    expect(primera).toEqual(segunda);
    expect(primera.cantidad).toBeLessThanOrEqual(100);
    expect(primera.cantidad).toBeGreaterThanOrEqual(5);
  });

  it('eleva la demanda en lluvia respecto a la época seca con la misma semilla', () => {
    const lluvia = demandaDelDia(
      new Date('2025-12-01T00:00:00.000Z'),
      parametros,
      new Azar('misma'),
    );
    const seca = demandaDelDia(new Date('2025-07-01T00:00:00.000Z'), parametros, new Azar('misma'));

    expect(lluvia.lluvioso).toBe(true);
    expect(seca.lluvioso).toBe(false);
    expect(lluvia.cantidad).toBeGreaterThan(seca.cantidad);
  });
});

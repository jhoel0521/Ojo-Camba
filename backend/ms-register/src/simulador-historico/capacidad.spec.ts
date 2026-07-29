import { evaluarCapacidad, META_VISITAS_DIARIAS } from './capacidad';

describe('capacidad de cuadrilla', () => {
  it('mantiene la meta de cinco visitas y alerta desde ocho reportes abiertos', () => {
    const capacidad = evaluarCapacidad(6, 2);
    expect(capacidad.visitasPermitidas).toBe(META_VISITAS_DIARIAS);
    expect(capacidad.alertaPreventiva).toBe(true);
    expect(capacidad.admiteAsignacion).toBe(true);
  });

  it('solicita apoyo y bloquea la asignación que supera diez reportes abiertos', () => {
    const capacidad = evaluarCapacidad(8, 3);
    expect(capacidad.requiereApoyo).toBe(true);
    expect(capacidad.admiteAsignacion).toBe(false);
  });
});

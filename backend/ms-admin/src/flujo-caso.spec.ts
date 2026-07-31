import { EstadoCaso, puedeTransicionarCaso, TRANSICIONES_CASO } from '@ojo-camba/common';

describe('flujo canónico de Casos de Obra (ISSUE-29)', () => {
  it.each([
    [EstadoCaso.PendienteAsignacion, EstadoCaso.PlanificadoVisita],
    [EstadoCaso.PlanificadoVisita, EstadoCaso.ValidacionCampo],
    [EstadoCaso.ValidacionCampo, EstadoCaso.Reencolado],
    [EstadoCaso.ValidacionCampo, EstadoCaso.EnTrabajo],
    [EstadoCaso.ValidacionCampo, EstadoCaso.Derivado],
    [EstadoCaso.ValidacionCampo, EstadoCaso.RechazadoCampo],
    [EstadoCaso.Reencolado, EstadoCaso.PlanificadoVisita],
    [EstadoCaso.EnTrabajo, EstadoCaso.PlanificadoVisita],
    [EstadoCaso.EnTrabajo, EstadoCaso.Finalizado],
  ])('permite %s → %s', (desde, hasta) => {
    expect(puedeTransicionarCaso(desde, hasta)).toBe(true);
  });

  it.each([
    [EstadoCaso.PendienteAsignacion, EstadoCaso.EnTrabajo],
    [EstadoCaso.PlanificadoVisita, EstadoCaso.Finalizado],
    [EstadoCaso.ValidacionCampo, EstadoCaso.Finalizado],
    [EstadoCaso.EnTrabajo, EstadoCaso.ValidacionCampo],
    [EstadoCaso.Finalizado, EstadoCaso.PlanificadoVisita],
    [EstadoCaso.Derivado, EstadoCaso.PlanificadoVisita],
  ])('rechaza el salto o retroceso %s → %s', (desde, hasta) => {
    expect(puedeTransicionarCaso(desde, hasta)).toBe(false);
  });

  it('declara estados terminales sin transiciones salientes', () => {
    expect(TRANSICIONES_CASO[EstadoCaso.Finalizado]).toEqual([]);
    expect(TRANSICIONES_CASO[EstadoCaso.Derivado]).toEqual([]);
    expect(TRANSICIONES_CASO[EstadoCaso.RechazadoCampo]).toEqual([]);
  });
});

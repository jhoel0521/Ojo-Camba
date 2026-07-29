import { cuadrillasDeCorrida } from './simulador';

describe('cuadrillasDeCorrida', () => {
  it('recupera y ordena solo las cuadrillas de la corrida interrumpida', () => {
    const resultado = cuadrillasDeCorrida(
      [
        { id: 44, nombre: 'Simulador otra-corrida - cuadrilla 1' },
        { id: 32, nombre: 'Simulador feria-2026 - cuadrilla 2' },
        { id: 31, nombre: 'Simulador feria-2026 - cuadrilla 1' },
        { id: 99, nombre: 'Cuadrilla municipal norte' },
      ],
      'feria-2026',
    );

    expect(resultado).toEqual([31, 32]);
  });
});

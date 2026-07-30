import { construirAsignacionesJornadaDemo, validarFechaJornada } from './jornada';

describe('jornada demo de operación', () => {
  it('reparte seis paradas entre responsable y dos técnicos, manteniendo su orden de ruta', () => {
    expect(construirAsignacionesJornadaDemo(6)).toEqual([
      { ordenRuta: 1, emailTecnico: 'jefe.cuadrilla@ojocamba.bo' },
      { ordenRuta: 2, emailTecnico: 'tecnico.1@ojocamba.bo' },
      { ordenRuta: 3, emailTecnico: 'tecnico.2@ojocamba.bo' },
      { ordenRuta: 4, emailTecnico: 'jefe.cuadrilla@ojocamba.bo' },
      { ordenRuta: 5, emailTecnico: 'tecnico.1@ojocamba.bo' },
      { ordenRuta: 6, emailTecnico: 'tecnico.2@ojocamba.bo' },
    ]);
  });

  it('exige una fecha ISO válida para que una ejecución sea repetible', () => {
    expect(validarFechaJornada('2026-07-30')).toBe('2026-07-30');
    expect(() => validarFechaJornada('30/07/2026')).toThrow('--fecha YYYY-MM-DD');
  });
});

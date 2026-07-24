import {
  analizarRuta,
  buscarHeuristica,
  buscarBacktracking,
  respetaPrioridad,
  costoRuta,
  type Punto,
  type ReporteRuta,
} from '@ojo-camba/common';

// Base = centro de Santa Cruz. Reportes sobre la misma latitud para razonar las
// distancias en una sola línea este-oeste (cada 0.001° de longitud ≈ 106 m).
const BASE: Punto = { lat: -17.7833, lng: -63.1821 };

function reporte(id: number, lng: number, gravedad = 'Media'): ReporteRuta {
  return { id, lat: -17.7833, lng, gravedad, categoria_id: 1 };
}

function idsUnicos(ruta: ReporteRuta[]): boolean {
  return new Set(ruta.map((r) => r.id)).size === ruta.length;
}

describe('buscarHeuristica (Fase 4 — ruta para Casos de Obra grandes)', () => {
  it('devuelve una ruta completa, sin repetir reportes y respetando la prioridad', () => {
    // 10 reportes (> MAX_REPORTES_COMPARACION = 8) con gravedades mezcladas.
    const gravedades = ['Baja', 'Media', 'Alta', 'Emergencia'];
    const reportes = Array.from({ length: 10 }, (_, i) =>
      reporte(i + 1, -63.182 + i * 0.001, gravedades[i % 4]),
    );

    const res = buscarHeuristica(BASE, reportes);

    expect(res.algoritmo).toBe('Heurística');
    expect(res.ruta).toHaveLength(10);
    expect(idsUnicos(res.ruta)).toBe(true);
    expect(res.respetaPrioridad).toBe(true);
    expect(respetaPrioridad(res.ruta)).toBe(true);
    expect(res.costoM).toBeGreaterThan(0);
  });

  it('prioriza una Emergencia lejana antes que varias Baja cercanas', () => {
    const reportes = [
      reporte(1, -63.1819, 'Baja'),
      reporte(2, -63.1818, 'Baja'),
      reporte(3, -63.1817, 'Baja'),
      reporte(4, -63.176, 'Emergencia'), // la más lejana, pero la más grave
    ];
    const res = buscarHeuristica(BASE, reportes);
    expect(res.ruta[0].gravedad).toBe('Emergencia');
    expect(res.respetaPrioridad).toBe(true);
  });

  it('en un caso chico de igual gravedad no es peor que el óptimo exacto (Backtracking)', () => {
    // Puntos colineales de igual gravedad: el óptimo es recorrerlos en orden.
    const reportes = [
      reporte(1, -63.1811),
      reporte(2, -63.1801),
      reporte(3, -63.1791),
      reporte(4, -63.1781),
      reporte(5, -63.1771),
    ];
    const heur = buscarHeuristica(BASE, reportes);
    const exacto = buscarBacktracking(BASE, reportes);

    // La heurística nunca puede costar menos que el óptimo…
    expect(heur.costoM).toBeGreaterThanOrEqual(exacto.costoM - 0.01);
    // …y en este caso lineal debe igualarlo (NN + 2-opt encuentra el óptimo).
    expect(Math.abs(heur.costoM - exacto.costoM)).toBeLessThan(1);
  });

  it('el 2-opt no deja una ruta con cruces obvios (costo == suma monótona en línea)', () => {
    // Mismo orden esperado A→B→C→D; el costo debe ser la distancia Base→A→B→C→D.
    const reportes = [
      reporte(4, -63.1781),
      reporte(2, -63.1801),
      reporte(1, -63.1811),
      reporte(3, -63.1791),
    ];
    const res = buscarHeuristica(BASE, reportes);
    const esperado = costoRuta(BASE, [
      reporte(1, -63.1811),
      reporte(2, -63.1801),
      reporte(3, -63.1791),
      reporte(4, -63.1781),
    ]);
    expect(Math.abs(res.costoM - esperado)).toBeLessThan(1);
  });
});

describe('analizarRuta (dispatcher exacto vs heurístico)', () => {
  it('usa la comparación exacta (Backtracking) para casos ≤ 8 reportes', () => {
    const reportes = Array.from({ length: 5 }, (_, i) => reporte(i + 1, -63.181 + i * 0.001));
    const a = analizarRuta(BASE, reportes);
    expect(a.exacto).toBe(true);
    expect(a.comparacion).toHaveLength(3);
    expect(a.recomendada.algoritmo).toBe('Backtracking');
  });

  it('cae a la heurística para casos > 8 reportes', () => {
    const reportes = Array.from({ length: 12 }, (_, i) => reporte(i + 1, -63.182 + i * 0.001));
    const a = analizarRuta(BASE, reportes);
    expect(a.exacto).toBe(false);
    expect(a.comparacion).toBeNull();
    expect(a.recomendada.algoritmo).toBe('Heurística');
    expect(a.recomendada.ruta).toHaveLength(12);
  });
});

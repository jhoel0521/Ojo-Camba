/**
 * Prueba manual del chequeo de alucinación numérica (Actividad 4).
 *
 * Ejecutar desde la raíz del monorepo:
 *   npx ts-node backend/gateway-principal/test/alucinacion.manual.ts
 *
 * NOTA: esta prueba NO llama a Groq. Verifica sólo la lógica local
 * verificarAlucinacionNumerica(). La prueba de integración real contra la API
 * de Groq requiere GROQ_API_KEY configurada en el .env del gateway.
 */
import { verificarAlucinacionNumerica } from '../src/explicador/alucinacion';

let fallos = 0;

function afirmar(nombre: string, obtenido: string[], esperado: string[]): void {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `${ok ? '✓' : '✗'} ${nombre}\n    esperado: ${JSON.stringify(esperado)}\n    obtenido: ${JSON.stringify(obtenido)}`,
  );
}

// ── Caso 1: explicación FIEL — todos los números salen del resultado ──────────
const resultadoRuta = {
  totalMetros: 317,
  respetaPrioridad: true,
  orden: [
    { posicion: 1, reporteId: 42, gravedad: 'Emergencia', metrosDesdeAnterior: 120 },
    { posicion: 2, reporteId: 43, gravedad: 'Media', metrosDesdeAnterior: 197 },
  ],
};
const explicacionFiel =
  'La ruta sugerida visita primero el reporte 42 (a 120 metros) y luego el 43, ' +
  'recorriendo 317 metros en total y atendiendo antes la Emergencia. La decisión final es tuya.';
afirmar(
  'Caso 1 — explicación fiel no marca ningún número',
  verificarAlucinacionNumerica(explicacionFiel, resultadoRuta),
  [],
);

// ── Caso 2: explicación con una cifra INVENTADA ("40%") que no está en el JSON ─
const explicacionAlucinada =
  'Seguir esta ruta reduce el tiempo de traslado en un 40% y recorre 317 metros. ' +
  'Vos decidís si la usás.';
afirmar(
  'Caso 2 — cifra inventada (40) queda marcada',
  verificarAlucinacionNumerica(explicacionAlucinada, resultadoRuta),
  ['40'],
);

// ── Caso 3 (extra): triaje fiel, números provenientes de los hechos y la traza ─
const resultadoTriaje = {
  gravedadSugerida: 'Alta',
  hechos: { recurrencia: 3, horasAntiguedad: 50 },
  reglasAplicadas: [
    { id: 'R13', descripcion: 'SI gravedad = Media Y horas >= 48 ENTONCES gravedad = Alta' },
  ],
};
const explicacionTriaje =
  'Se sugiere gravedad Alta porque el problema se reportó 3 veces y ya pasaron 50 horas ' +
  'sin atención, superando el umbral de 48. Confirmá vos la clasificación.';
afirmar(
  'Caso 3 — triaje fiel (3, 50 y 48 están respaldados)',
  verificarAlucinacionNumerica(explicacionTriaje, resultadoTriaje),
  [],
);

if (fallos === 0) {
  console.log('\nTODAS LAS PRUEBAS PASARON');
} else {
  throw new Error(`${fallos} PRUEBA(S) FALLARON`);
}

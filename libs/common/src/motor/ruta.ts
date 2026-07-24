/**
 * Motor simbólico de ruta — fuente canónica única.
 *
 * Vive en libs/common (sin dependencias externas) para que ms-ia lo use con el
 * centroide del Caso de Obra como Base (el servidor no tiene el GPS del
 * técnico), y para que a futuro frontend/app-tecnico pueda importar las mismas
 * funciones puras usando el GPS real como Base, sin duplicar el algoritmo. Las
 * herramientas del asistente devuelven esta traza; el LLM la relata, no la
 * inventa.
 */

export interface Punto {
  lat: number;
  lng: number;
}

export interface ReporteRuta {
  id: number;
  lat: number;
  lng: number;
  gravedad: string;
  categoria_id: number;
}

export type NombreAlgoritmo = 'BFS' | 'DFS' | 'Backtracking' | 'Heurística';

export interface TramoRuta {
  reporte: ReporteRuta;
  distanciaM: number;
}

export interface ResultadoBusqueda {
  algoritmo: NombreAlgoritmo;
  ruta: ReporteRuta[];
  tramos: TramoRuta[];
  costoM: number;
  estadosExplorados: number;
  optima: boolean;
  respetaPrioridad: boolean;
}

export const MAX_REPORTES_COMPARACION = 8;

const ORDEN_GRAVEDAD: Record<string, number> = { Baja: 1, Media: 2, Alta: 3, Emergencia: 4 };

export function nivelGravedad(gravedad: string): number {
  return ORDEN_GRAVEDAD[gravedad] ?? 0;
}

export function haversineM(a: Punto, b: Punto): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

interface EstadoParcial {
  pos: Punto;
  ruta: ReporteRuta[];
  costo: number;
}

function puntoDe(r: ReporteRuta): Punto {
  return { lat: r.lat, lng: r.lng };
}

function tramosDe(base: Punto, ruta: ReporteRuta[]): TramoRuta[] {
  let pos = base;
  return ruta.map((reporte) => {
    const distanciaM = haversineM(pos, reporte);
    pos = puntoDe(reporte);
    return { reporte, distanciaM };
  });
}

export function respetaPrioridad(ruta: ReporteRuta[]): boolean {
  for (let i = 0; i < ruta.length; i++) {
    const restantes = ruta.slice(i);
    const maxNivel = Math.max(...restantes.map((r) => nivelGravedad(r.gravedad)));
    if (nivelGravedad(ruta[i].gravedad) < maxNivel) return false;
  }
  return true;
}

export function buscarBFS(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let mejor: EstadoParcial | null = null;
  let estadosExplorados = 0;
  const cola: EstadoParcial[] = [{ pos: base, ruta: [], costo: 0 }];
  let cabeza = 0;

  while (cabeza < cola.length) {
    const estado = cola[cabeza++];
    estadosExplorados++;
    if (estado.ruta.length === reportes.length) {
      if (mejor === null || estado.costo < mejor.costo) mejor = estado;
      continue;
    }
    for (const r of reportes) {
      if (estado.ruta.some((v) => v.id === r.id)) continue;
      cola.push({
        pos: puntoDe(r),
        ruta: [...estado.ruta, r],
        costo: estado.costo + haversineM(estado.pos, r),
      });
    }
  }

  const ruta = mejor?.ruta ?? [];
  return {
    algoritmo: 'BFS',
    ruta,
    tramos: tramosDe(base, ruta),
    costoM: mejor?.costo ?? 0,
    estadosExplorados,
    optima: false,
    respetaPrioridad: respetaPrioridad(ruta),
  };
}

export function buscarDFS(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let estadosExplorados = 0;
  const pila: EstadoParcial[] = [{ pos: base, ruta: [], costo: 0 }];

  while (pila.length > 0) {
    const estado = pila.pop() as EstadoParcial;
    estadosExplorados++;
    if (estado.ruta.length === reportes.length) {
      return {
        algoritmo: 'DFS',
        ruta: estado.ruta,
        tramos: tramosDe(base, estado.ruta),
        costoM: estado.costo,
        estadosExplorados,
        optima: false,
        respetaPrioridad: respetaPrioridad(estado.ruta),
      };
    }
    for (const r of reportes) {
      if (estado.ruta.some((v) => v.id === r.id)) continue;
      pila.push({
        pos: puntoDe(r),
        ruta: [...estado.ruta, r],
        costo: estado.costo + haversineM(estado.pos, r),
      });
    }
  }

  return {
    algoritmo: 'DFS',
    ruta: [],
    tramos: [],
    costoM: 0,
    estadosExplorados,
    optima: false,
    respetaPrioridad: true,
  };
}

function candidatosPorPrioridad(pendientes: ReporteRuta[]): ReporteRuta[] {
  if (pendientes.length === 0) return [];
  const maxNivel = Math.max(...pendientes.map((r) => nivelGravedad(r.gravedad)));
  return pendientes.filter((r) => nivelGravedad(r.gravedad) === maxNivel);
}

export function buscarBacktracking(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let mejorRuta: ReporteRuta[] = [];
  let mejorCosto = Infinity;
  let estadosExplorados = 0;

  const visitados: ReporteRuta[] = [];
  const pendientes = new Map(reportes.map((r) => [r.id, r]));

  function expandir(pos: Punto, costo: number): void {
    estadosExplorados++;
    if (visitados.length === reportes.length) {
      if (costo < mejorCosto) {
        mejorCosto = costo;
        mejorRuta = [...visitados];
      }
      return;
    }
    if (costo >= mejorCosto) return;

    for (const candidato of candidatosPorPrioridad([...pendientes.values()])) {
      const nuevoCosto = costo + haversineM(pos, candidato);
      if (nuevoCosto >= mejorCosto) continue;
      visitados.push(candidato);
      pendientes.delete(candidato.id);
      expandir(puntoDe(candidato), nuevoCosto);
      visitados.pop();
      pendientes.set(candidato.id, candidato);
    }
  }

  expandir(base, 0);

  return {
    algoritmo: 'Backtracking',
    ruta: mejorRuta,
    tramos: tramosDe(base, mejorRuta),
    costoM: mejorRuta.length > 0 ? mejorCosto : 0,
    estadosExplorados,
    optima: false,
    respetaPrioridad: respetaPrioridad(mejorRuta),
  };
}

export interface ComparacionRutas {
  bfs: ResultadoBusqueda;
  dfs: ResultadoBusqueda;
  backtracking: ResultadoBusqueda;
  todos: ResultadoBusqueda[];
}

export function compararAlgoritmos(base: Punto, reportes: ReporteRuta[]): ComparacionRutas {
  const bfs = buscarBFS(base, reportes);
  const dfs = buscarDFS(base, reportes);
  const backtracking = buscarBacktracking(base, reportes);

  const todos = [bfs, dfs, backtracking];
  const minimo = Math.min(...todos.map((r) => r.costoM));
  for (const r of todos) {
    r.optima = Math.abs(r.costoM - minimo) < 0.01;
  }
  return { bfs, dfs, backtracking, todos };
}

/** Costo total (haversine acumulado) de recorrer una ruta desde la Base. */
export function costoRuta(base: Punto, ruta: ReporteRuta[]): number {
  let pos = base;
  let total = 0;
  for (const r of ruta) {
    total += haversineM(pos, r);
    pos = puntoDe(r);
  }
  return total;
}

/**
 * Mejora local 2-opt: prueba invertir cada segmento [i..k] y se queda con la
 * inversión si baja el costo. La guarda respetaPrioridad() descarta cualquier
 * inversión que rompa el orden por gravedad (invertir un tramo que cruza dos
 * niveles de gravedad lo violaría; invertir dentro de un mismo nivel no).
 * `contar` acumula las inversiones evaluadas como proxy de "estados explorados".
 */
function mejorar2opt(base: Punto, rutaInicial: ReporteRuta[], contar: () => void): ReporteRuta[] {
  let mejor = [...rutaInicial];
  let mejorCosto = costoRuta(base, mejor);

  let huboMejora = true;
  while (huboMejora) {
    huboMejora = false;
    for (let i = 0; i < mejor.length - 1; i++) {
      for (let k = i + 1; k < mejor.length; k++) {
        contar();
        const candidata = [
          ...mejor.slice(0, i),
          ...mejor.slice(i, k + 1).reverse(),
          ...mejor.slice(k + 1),
        ];
        if (!respetaPrioridad(candidata)) continue;
        const costo = costoRuta(base, candidata);
        if (costo < mejorCosto - 0.01) {
          mejor = candidata;
          mejorCosto = costo;
          huboMejora = true;
        }
      }
    }
  }
  return mejor;
}

/**
 * Heurística de respaldo para Casos de Obra grandes (> MAX_REPORTES_COMPARACION),
 * donde la comparación exhaustiva es inviable (crece como n!). No garantiza el
 * óptimo, pero siempre sugiere un orden razonable en tiempo polinómico:
 *  1. Vecino más cercano respetando la prioridad por gravedad: en cada paso solo
 *     considera los pendientes de gravedad máxima y salta al más próximo.
 *  2. Mejora local 2-opt con guarda de prioridad sobre la ruta resultante.
 * Como el paso 1 solo elige entre los de gravedad máxima, la ruta queda en orden
 * de gravedad no creciente y respetaPrioridad() se cumple por construcción.
 */
export function buscarHeuristica(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let estadosExplorados = 0;
  const contar = (): void => {
    estadosExplorados++;
  };

  const pendientes = [...reportes];
  const ruta: ReporteRuta[] = [];
  let pos = base;

  while (pendientes.length > 0) {
    const nivelMax = Math.max(...pendientes.map((r) => nivelGravedad(r.gravedad)));
    let mejorIdx = -1;
    let mejorDist = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      if (nivelGravedad(pendientes[i].gravedad) !== nivelMax) continue;
      contar();
      const d = haversineM(pos, pendientes[i]);
      if (d < mejorDist) {
        mejorDist = d;
        mejorIdx = i;
      }
    }
    const elegido = pendientes.splice(mejorIdx, 1)[0];
    ruta.push(elegido);
    pos = puntoDe(elegido);
  }

  const mejorada = mejorar2opt(base, ruta, contar);

  return {
    algoritmo: 'Heurística',
    ruta: mejorada,
    tramos: tramosDe(base, mejorada),
    costoM: costoRuta(base, mejorada),
    estadosExplorados,
    optima: false,
    respetaPrioridad: respetaPrioridad(mejorada),
  };
}

export interface AnalisisRuta {
  /** Ruta a seguir: la óptima (Backtracking) si el caso es chico, o la heurística si es grande. */
  recomendada: ResultadoBusqueda;
  /** Comparación de los tres algoritmos exactos; null cuando se usó la heurística. */
  comparacion: ResultadoBusqueda[] | null;
  /** true si se calculó el óptimo exacto; false si fue una aproximación heurística. */
  exacto: boolean;
}

/**
 * Punto de entrada único para sugerir una ruta: usa la comparación exhaustiva
 * (óptima) mientras es viable, y cae a la heurística de respaldo por encima de
 * MAX_REPORTES_COMPARACION, en vez de no sugerir nada.
 */
export function analizarRuta(base: Punto, reportes: ReporteRuta[]): AnalisisRuta {
  if (reportes.length <= MAX_REPORTES_COMPARACION) {
    const comp = compararAlgoritmos(base, reportes);
    return { recomendada: comp.backtracking, comparacion: comp.todos, exacto: true };
  }
  return { recomendada: buscarHeuristica(base, reportes), comparacion: null, exacto: false };
}

/** Centroide (promedio de lat/lng) de los reportes: la Base cuando no hay GPS. */
export function centroide(reportes: ReporteRuta[]): Punto {
  const n = reportes.length || 1;
  const sum = reportes.reduce((acc, r) => ({ lat: acc.lat + r.lat, lng: acc.lng + r.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / n, lng: sum.lng / n };
}

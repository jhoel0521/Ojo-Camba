/**
 * Motor simbólico de ruta (lado servidor).
 *
 * Portado de frontend/app-tecnico/src/lib/rutaEstados.ts. Como el servidor no
 * tiene el GPS del técnico, la "Base" del recorrido es el centroide de los
 * reportes del Caso de Obra (una vista de planificación). Las herramientas del
 * asistente devuelven esta traza; el LLM la relata, no la inventa.
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

export type NombreAlgoritmo = 'BFS' | 'DFS' | 'Backtracking';

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

/** Centroide (promedio de lat/lng) de los reportes: la Base cuando no hay GPS. */
export function centroide(reportes: ReporteRuta[]): Punto {
  const n = reportes.length || 1;
  const sum = reportes.reduce((acc, r) => ({ lat: acc.lat + r.lat, lng: acc.lng + r.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / n, lng: sum.lng / n };
}

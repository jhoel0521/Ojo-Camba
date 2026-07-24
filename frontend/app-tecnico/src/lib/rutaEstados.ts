/**
 * RutaOjoCamba — búsqueda en espacio de estados para ordenar la visita de los
 * reportes de un Caso de Obra.
 *
 * Formalización:
 *   Estado          = (posición actual del técnico, conjunto de reportes ya visitados)
 *   Estado inicial  = (Base = GPS actual del técnico, ∅)
 *   Estado meta     = (cualquier posición, todos los reportes visitados)
 *   Operador        = Visitar(reporte_k): mueve al técnico a un reporte no visitado
 *                     y lo agrega al conjunto de visitados. Grafo completo y no dirigido.
 *   Costo           = distancia haversine en metros entre dos puntos.
 *   Restricción     = no se puede visitar un reporte si queda pendiente otro de
 *                     gravedad mayor (Emergencia > Alta > Media > Baja).
 *
 * Es apoyo a la decisión: sugiere un orden, no lo impone.
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
  /** Distancia desde el punto anterior (Base para el primer tramo). */
  distanciaM: number;
}

export interface ResultadoBusqueda {
  algoritmo: NombreAlgoritmo;
  ruta: ReporteRuta[];
  tramos: TramoRuta[];
  costoM: number;
  estadosExplorados: number;
  /** Costo mínimo entre los tres algoritmos comparados. Lo fija compararAlgoritmos(). */
  optima: boolean;
  respetaPrioridad: boolean;
}

/**
 * La comparación es exhaustiva (BFS recorre O(n!) rutas parciales), así que se
 * acota el tamaño del Caso de Obra para no congelar el navegador del técnico.
 */
export const MAX_REPORTES_COMPARACION = 8;

const ORDEN_GRAVEDAD: Record<string, number> = {
  Baja: 1,
  Media: 2,
  Alta: 3,
  Emergencia: 4,
};

export function nivelGravedad(gravedad: string): number {
  return ORDEN_GRAVEDAD[gravedad] ?? 0;
}

/** Distancia real entre dos puntos en metros (haversine). */
export function haversineM(a: Punto, b: Punto): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
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

/** Reconstruye los tramos de una ruta para poder mostrar la distancia de cada salto. */
function tramosDe(base: Punto, ruta: ReporteRuta[]): TramoRuta[] {
  let pos = base;
  return ruta.map((reporte) => {
    const distanciaM = haversineM(pos, reporte);
    pos = puntoDe(reporte);
    return { reporte, distanciaM };
  });
}

/**
 * Verifica a posteriori si una ruta cumple la restricción de dominio: en cada paso,
 * el reporte visitado debe tener la gravedad máxima entre los que aún quedaban.
 */
export function respetaPrioridad(ruta: ReporteRuta[]): boolean {
  for (let i = 0; i < ruta.length; i++) {
    const restantes = ruta.slice(i);
    const maxNivel = Math.max(...restantes.map((r) => nivelGravedad(r.gravedad)));
    if (nivelGravedad(ruta[i].gravedad) < maxNivel) return false;
  }
  return true;
}

/**
 * BFS (cola FIFO): expande las rutas parciales nivel por nivel y las recorre todas.
 * Encuentra el costo mínimo por fuerza bruta, pero no evalúa la restricción de gravedad.
 */
export function buscarBFS(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let mejor: EstadoParcial | null = null;
  let estadosExplorados = 0;

  // Cola FIFO con puntero de cabeza: shift() sobre decenas de miles de estados es
  // O(n) y volvería el recorrido cuadrático.
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

/**
 * DFS (pila LIFO): profundiza hasta la primera ruta completa y se detiene ahí.
 * Rápido, sin garantía de optimalidad y sin evaluar la restricción de gravedad.
 */
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

/**
 * De los pendientes, solo son visitables los de gravedad máxima: así no se posterga
 * una Emergencia por ir antes a una Baja más cercana.
 */
function candidatosPorPrioridad(pendientes: ReporteRuta[]): ReporteRuta[] {
  if (pendientes.length === 0) return [];
  const maxNivel = Math.max(...pendientes.map((r) => nivelGravedad(r.gravedad)));
  return pendientes.filter((r) => nivelGravedad(r.gravedad) === maxNivel);
}

/**
 * Backtracking con doble poda — el algoritmo recomendado: garantiza el costo mínimo
 * ENTRE LAS RUTAS VÁLIDAS y respeta la prioridad por gravedad.
 *  - Poda por costo (branch and bound): corta la rama si el costo acumulado ya iguala
 *    o supera el mejor costo válido encontrado.
 *  - Poda por prioridad: solo expande candidatos de gravedad máxima entre los pendientes.
 *  - Al agotar una rama deshace la decisión (saca el nodo de visitados) y prueba la siguiente.
 */
export function buscarBacktracking(base: Punto, reportes: ReporteRuta[]): ResultadoBusqueda {
  let mejorRuta: ReporteRuta[] = [];
  let mejorCosto = Infinity;
  let estadosExplorados = 0;

  const visitados: ReporteRuta[] = [];
  const pendientes = new Map(reportes.map((r) => [r.id, r]));

  function expandir(pos: Punto, costo: number) {
    estadosExplorados++;

    if (visitados.length === reportes.length) {
      if (costo < mejorCosto) {
        mejorCosto = costo;
        mejorRuta = [...visitados];
      }
      return;
    }

    // Poda por costo: esta rama ya no puede mejorar al mejor válido conocido.
    if (costo >= mejorCosto) return;

    for (const candidato of candidatosPorPrioridad([...pendientes.values()])) {
      const nuevoCosto = costo + haversineM(pos, candidato);
      if (nuevoCosto >= mejorCosto) continue;

      visitados.push(candidato);
      pendientes.delete(candidato.id);

      expandir(puntoDe(candidato), nuevoCosto);

      // Backtrack: deshacer la decisión y probar el siguiente candidato.
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
  /** Orden estable para render: BFS, DFS, Backtracking. */
  todos: ResultadoBusqueda[];
}

/**
 * Corre los tres algoritmos sobre el mismo espacio de estados y marca cuáles
 * alcanzaron el costo mínimo. Ojo: Backtracking puede costar más que BFS y aun así
 * ser el recomendado, porque BFS logra su costo saltándose la prioridad por gravedad.
 */
export function compararAlgoritmos(base: Punto, reportes: ReporteRuta[]): ComparacionRutas {
  const bfs = buscarBFS(base, reportes);
  const dfs = buscarDFS(base, reportes);
  const backtracking = buscarBacktracking(base, reportes);

  const todos = [bfs, dfs, backtracking];
  const minimo = Math.min(...todos.map((r) => r.costoM));
  for (const r of todos) {
    // Tolerancia por el redondeo de punto flotante del haversine.
    r.optima = Math.abs(r.costoM - minimo) < 0.01;
  }

  return { bfs, dfs, backtracking, todos };
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE PRUEBA MANUALES — números verificados ejecutando este motor.
 *
 * Base = (-17.7833, -63.1821), centro de Santa Cruz. Todos los reportes sobre la
 * misma latitud (-17.7833) para razonar las distancias en una sola línea
 * este-oeste; cada 0.001° de longitud ≈ 106 m.
 *
 * (a) BFS y Backtracking coinciden en costo — misma gravedad en todos, así que la
 *     restricción de prioridad no descarta ninguna ruta:
 *       A(lng -63.1811) Media, B(lng -63.1801) Media, C(lng -63.1791) Media
 *     → BFS          : A→B→C   317.6 m   16 estados   óptima ✓   prioridad ✓
 *     → DFS          : C→B→A   529.4 m    4 estados   óptima ✗   prioridad ✓
 *     → Backtracking : A→B→C   317.6 m    9 estados   óptima ✓   prioridad ✓
 *
 * (b) Orden de exploración adverso: DFS da una ruta más cara que las otras dos.
 *     La pila LIFO expande primero el ÚLTIMO reporte del arreglo; si ese es el más
 *     lejano, DFS arranca cruzando todo el caso y recién vuelve:
 *       A(lng -63.1811) Media, B(lng -63.1801) Media, C(lng -63.1741) Media
 *     → BFS          : A→B→C    847.1 m   16 estados   óptima ✓   prioridad ✓
 *     → DFS          : C→B→A   1588.2 m    4 estados   óptima ✗   prioridad ✓   (+87 % de costo)
 *     → Backtracking : A→B→C    847.1 m    9 estados   óptima ✓   prioridad ✓
 *
 * (c) Emergencia lejana: BFS la posterga por cercanía, Backtracking la prioriza:
 *       A(lng -63.1811) Baja, B(lng -63.1801) Baja, E(lng -63.1781) Emergencia
 *     → BFS          : A→B→E   423.5 m   16 estados   óptima ✓   prioridad ✗  ← posterga la Emergencia
 *     → DFS          : E→B→A   741.2 m    4 estados   óptima ✗   prioridad ✓  ← por azar del orden LIFO, no porque la evalúe
 *     → Backtracking : E→B→A   741.2 m    6 estados   óptima ✗   prioridad ✓
 *     Backtracking cuesta 75 % más que BFS y aun así es la ruta a seguir: es la más
 *     barata ENTRE LAS VÁLIDAS. El costo mínimo de BFS solo se alcanza rompiendo la
 *     regla de negocio.
 *
 * Escala medida: con el tope de 8 reportes, BFS explora 109 601 estados en ~81 ms y
 * Backtracking 1629 en <1 ms. Los Casos de Obra reales llegan hasta 5 reportes (~1 ms).
 * ─────────────────────────────────────────────────────────────────────────────
 */

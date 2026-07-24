/**
 * TriajeOjoCamba — sistema experto de apoyo a la decisión para el moderador.
 *
 * Motor de encadenamiento hacia adelante (forward chaining) sobre 15 reglas SI-ENTONCES.
 * Nunca decide por el moderador: sugiere una gravedad y expone la traza que la justifica.
 */

export type GravedadValor = 'Baja' | 'Media' | 'Alta' | 'Emergencia';

export type TipoTriaje = 'bache' | 'luminaria' | 'basura' | 'canal_obstruido' | 'otro';

export type Temporada = 'lluvias' | 'seca';

export type UbicacionSensible = 'ninguna' | 'via_principal' | 'escuela' | 'hospital';

export type BloqueTriaje = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface HechosTriaje {
  tipo: TipoTriaje;
  temporada: Temporada;
  ubicacion_sensible: UbicacionSensible;
  /** Cuántas veces se reportó el mismo problema, contando el reporte bajo revisión. */
  recurrencia: number;
  /** Horas transcurridas desde que el ciudadano creó el reporte. */
  horas: number;
  palabra_clave_riesgo: boolean;
}

export interface ReglaDisparada {
  id: string;
  bloque: BloqueTriaje;
  texto: string;
  conclusion: string;
}

export interface ResultadoTriaje {
  /** null cuando ninguna regla cubre la combinación de hechos: no se fuerza una clasificación. */
  gravedad: GravedadValor | null;
  traza: ReglaDisparada[];
  accion: string | null;
}

type Conclusion = { tipo: 'gravedad'; valor: GravedadValor } | { tipo: 'accion'; valor: string };

interface DefinicionRegla {
  id: string;
  bloque: BloqueTriaje;
  texto: string;
  cuando: (h: HechosTriaje, gravedad: GravedadValor | null) => boolean;
  entonces: Conclusion;
}

/** La prioridad de los bloques A > B > C > D coincide con la severidad de sus conclusiones. */
const ORDEN_GRAVEDAD: Record<GravedadValor, number> = {
  Baja: 1,
  Media: 2,
  Alta: 3,
  Emergencia: 4,
};

export const ETIQUETAS_UBICACION: Record<UbicacionSensible, string> = {
  ninguna: 'Ninguna',
  via_principal: 'Vía principal',
  escuela: 'Escuela',
  hospital: 'Hospital',
};

const REGLAS: DefinicionRegla[] = [
  // ── Bloque A: máxima prioridad ──
  {
    id: 'R1',
    bloque: 'A',
    texto: 'SI palabra_clave_riesgo = verdadero ENTONCES gravedad = Emergencia',
    cuando: (h) => h.palabra_clave_riesgo,
    entonces: { tipo: 'gravedad', valor: 'Emergencia' },
  },
  {
    id: 'R2',
    bloque: 'A',
    texto:
      'SI tipo = canal_obstruido Y temporada = lluvias Y ubicacion_sensible ≠ ninguna ENTONCES gravedad = Emergencia',
    cuando: (h) =>
      h.tipo === 'canal_obstruido' &&
      h.temporada === 'lluvias' &&
      h.ubicacion_sensible !== 'ninguna',
    entonces: { tipo: 'gravedad', valor: 'Emergencia' },
  },
  {
    id: 'R3',
    bloque: 'A',
    texto:
      'SI tipo = canal_obstruido Y temporada = lluvias Y recurrencia ≥ 3 ENTONCES gravedad = Emergencia',
    cuando: (h) => h.tipo === 'canal_obstruido' && h.temporada === 'lluvias' && h.recurrencia >= 3,
    entonces: { tipo: 'gravedad', valor: 'Emergencia' },
  },

  // ── Bloque B: Alta ──
  {
    id: 'R4',
    bloque: 'B',
    texto: 'SI tipo = bache Y ubicacion_sensible = via_principal ENTONCES gravedad = Alta',
    cuando: (h) => h.tipo === 'bache' && h.ubicacion_sensible === 'via_principal',
    entonces: { tipo: 'gravedad', valor: 'Alta' },
  },
  {
    id: 'R5',
    bloque: 'B',
    texto: 'SI tipo = luminaria Y ubicacion_sensible = escuela ENTONCES gravedad = Alta',
    cuando: (h) => h.tipo === 'luminaria' && h.ubicacion_sensible === 'escuela',
    entonces: { tipo: 'gravedad', valor: 'Alta' },
  },
  {
    id: 'R6',
    bloque: 'B',
    texto:
      'SI tipo = canal_obstruido Y temporada = lluvias Y ubicacion_sensible = ninguna Y recurrencia < 3 ENTONCES gravedad = Alta',
    cuando: (h) =>
      h.tipo === 'canal_obstruido' &&
      h.temporada === 'lluvias' &&
      h.ubicacion_sensible === 'ninguna' &&
      h.recurrencia < 3,
    entonces: { tipo: 'gravedad', valor: 'Alta' },
  },

  // ── Bloque C: Media ──
  {
    id: 'R7',
    bloque: 'C',
    texto:
      'SI tipo = bache Y ubicacion_sensible ≠ via_principal Y recurrencia ≥ 2 ENTONCES gravedad = Media',
    cuando: (h) =>
      h.tipo === 'bache' && h.ubicacion_sensible !== 'via_principal' && h.recurrencia >= 2,
    entonces: { tipo: 'gravedad', valor: 'Media' },
  },
  {
    id: 'R8',
    bloque: 'C',
    texto:
      'SI tipo = luminaria Y ubicacion_sensible NO EN {escuela, hospital} ENTONCES gravedad = Media',
    cuando: (h) =>
      h.tipo === 'luminaria' &&
      h.ubicacion_sensible !== 'escuela' &&
      h.ubicacion_sensible !== 'hospital',
    entonces: { tipo: 'gravedad', valor: 'Media' },
  },
  {
    id: 'R9',
    bloque: 'C',
    texto: 'SI tipo = basura Y recurrencia ≥ 3 ENTONCES gravedad = Media',
    cuando: (h) => h.tipo === 'basura' && h.recurrencia >= 3,
    entonces: { tipo: 'gravedad', valor: 'Media' },
  },
  {
    id: 'R10',
    bloque: 'C',
    texto:
      'SI tipo = otro Y palabra_clave_riesgo = falso ENTONCES gravedad = Media (conservadora por defecto)',
    cuando: (h) => h.tipo === 'otro' && !h.palabra_clave_riesgo,
    entonces: { tipo: 'gravedad', valor: 'Media' },
  },

  // ── Bloque D: Baja ──
  {
    id: 'R11',
    bloque: 'D',
    texto:
      'SI tipo = bache Y ubicacion_sensible = ninguna Y recurrencia < 2 ENTONCES gravedad = Baja',
    cuando: (h) => h.tipo === 'bache' && h.ubicacion_sensible === 'ninguna' && h.recurrencia < 2,
    entonces: { tipo: 'gravedad', valor: 'Baja' },
  },
  {
    id: 'R12',
    bloque: 'D',
    texto: 'SI tipo = basura Y recurrencia < 3 ENTONCES gravedad = Baja',
    cuando: (h) => h.tipo === 'basura' && h.recurrencia < 3,
    entonces: { tipo: 'gravedad', valor: 'Baja' },
  },

  // ── Bloque E: escalamiento (encadena sobre una gravedad ya inferida) ──
  {
    id: 'R13',
    bloque: 'E',
    texto: 'SI gravedad = Media Y horas ≥ 48 ENTONCES gravedad = Alta',
    cuando: (h, gravedad) => gravedad === 'Media' && h.horas >= 48,
    entonces: { tipo: 'gravedad', valor: 'Alta' },
  },
  {
    id: 'R14',
    bloque: 'E',
    texto: 'SI gravedad = Alta Y horas ≥ 72 ENTONCES gravedad = Emergencia',
    cuando: (h, gravedad) => gravedad === 'Alta' && h.horas >= 72,
    entonces: { tipo: 'gravedad', valor: 'Emergencia' },
  },

  // ── Bloque F: notificación, nunca acción automática ──
  {
    id: 'R15',
    bloque: 'F',
    texto: 'SI gravedad = Emergencia ENTONCES accion = "Notificar de inmediato al Back Office"',
    cuando: (_h, gravedad) => gravedad === 'Emergencia',
    entonces: { tipo: 'accion', valor: 'Notificar de inmediato al Back Office' },
  },
];

/**
 * Encadena las reglas hasta el punto fijo: en cada ciclo dispara la primera regla
 * aplicable y vuelve a empezar, porque el Bloque E puede reactivar conclusiones
 * a partir de una gravedad recién inferida.
 */
export function inferirTriaje(hechos: HechosTriaje): ResultadoTriaje {
  let gravedad: GravedadValor | null = null;
  let accion: string | null = null;
  const traza: ReglaDisparada[] = [];
  const disparadas = new Set<string>();

  let huboCambio = true;
  while (huboCambio) {
    huboCambio = false;

    for (const regla of REGLAS) {
      // Refracción: una regla no se vuelve a disparar con los mismos hechos.
      if (disparadas.has(regla.id)) continue;
      if (!regla.cuando(hechos, gravedad)) continue;

      // Prioridad de bloques: una conclusión menos severa no degrada una gravedad
      // ya inferida por un bloque de mayor prioridad (p. ej. R11 no baja lo que dictó R1).
      if (
        regla.entonces.tipo === 'gravedad' &&
        gravedad !== null &&
        ORDEN_GRAVEDAD[regla.entonces.valor] < ORDEN_GRAVEDAD[gravedad]
      ) {
        continue;
      }

      if (regla.entonces.tipo === 'gravedad') gravedad = regla.entonces.valor;
      else accion = regla.entonces.valor;

      disparadas.add(regla.id);
      traza.push({
        id: regla.id,
        bloque: regla.bloque,
        texto: regla.texto,
        conclusion: regla.entonces.valor,
      });
      huboCambio = true;
      break;
    }
  }

  return { gravedad, traza, accion };
}

/**
 * Categorías reales del Back Office → tipos del sistema experto.
 * Trafico (5) y Otro (6) no tienen regla propia: caen en 'otro', que R10 clasifica
 * como Media por defecto, nunca como Baja.
 */
export function tipoDesdeCategoria(categoriaId: number): TipoTriaje {
  switch (categoriaId) {
    case 1:
      return 'bache';
    case 2:
      return 'luminaria';
    case 3:
      return 'basura';
    case 4:
      return 'canal_obstruido';
    default:
      return 'otro';
  }
}

/** Temporada de lluvias en Santa Cruz de la Sierra: noviembre a marzo. */
export function temporadaDeFecha(fecha: Date): Temporada {
  const mes = fecha.getMonth() + 1;
  return mes >= 11 || mes <= 3 ? 'lluvias' : 'seca';
}

export function horasTranscurridas(creadoEn: string, ahora: Date = new Date()): number {
  const desde = new Date(creadoEn).getTime();
  if (Number.isNaN(desde)) return 0;
  return Math.max(0, (ahora.getTime() - desde) / 3_600_000);
}

/**
 * El reporte bajo revisión cuenta como la primera ocurrencia; los cercanos suman
 * a partir de ahí (recurrencia = 2 significa "reportado dos veces en ≤100 m").
 */
export function recurrenciaDesdeCercanos(distanciasM: number[], radioM = 100): number {
  return 1 + distanciasM.filter((d) => d <= radioM).length;
}

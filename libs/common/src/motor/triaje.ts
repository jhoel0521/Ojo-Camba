/**
 * Motor simbólico de triaje — fuente canónica única.
 *
 * Vive en libs/common (sin dependencias externas) para que ms-ia (herramienta
 * `explicar_triaje` del asistente, endpoint `ia.inferir_triaje`) y el backoffice
 * (vía HTTP, ver frontend/app-backoffice/src/lib/triajeApi.ts) usen exactamente
 * la misma lógica y traza de reglas. El LLM relata esta traza; no la inventa.
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
  recurrencia: number;
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

const ORDEN_GRAVEDAD: Record<GravedadValor, number> = {
  Baja: 1,
  Media: 2,
  Alta: 3,
  Emergencia: 4,
};

const REGLAS: DefinicionRegla[] = [
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
  {
    id: 'R15',
    bloque: 'F',
    texto: 'SI gravedad = Emergencia ENTONCES accion = "Notificar de inmediato al Back Office"',
    cuando: (_h, gravedad) => gravedad === 'Emergencia',
    entonces: { tipo: 'accion', valor: 'Notificar de inmediato al Back Office' },
  },
];

export function inferirTriaje(hechos: HechosTriaje): ResultadoTriaje {
  let gravedad: GravedadValor | null = null;
  let accion: string | null = null;
  const traza: ReglaDisparada[] = [];
  const disparadas = new Set<string>();

  let huboCambio = true;
  while (huboCambio) {
    huboCambio = false;

    for (const regla of REGLAS) {
      if (disparadas.has(regla.id)) continue;
      if (!regla.cuando(hechos, gravedad)) continue;

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

/** El reporte bajo revisión cuenta como la primera ocurrencia; los cercanos suman. */
export function recurrenciaDesdeCercanos(distanciasM: number[], radioM = 100): number {
  return 1 + distanciasM.filter((d) => d <= radioM).length;
}

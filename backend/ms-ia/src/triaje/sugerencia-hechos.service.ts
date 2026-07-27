import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS, tipoDesdeCategoria, type UbicacionSensible } from '@ojo-camba/common';
import { sendRpc } from '../rpc.helper';
import { AiProviderRegistry } from '../ai/ai-provider.registry';
import type { AiImagen } from '../ai/ai-provider';

const UBICACIONES: UbicacionSensible[] = ['ninguna', 'via_principal', 'escuela', 'hospital'];
/** Groq acepta hasta 5 imágenes por request: 1 del reporte + hasta 4 cercanos. */
const MAX_CERCANOS = 4;
/** Las obras no van con foto, pero igual conviene topear el contexto textual. */
const MAX_OBRAS = 5;

interface ReporteCrudo {
  id: number;
  categoria_id: number;
}

interface ImagenCruda {
  data: string;
  contentType: string;
}

interface GrupoCrudo {
  id: number;
  codigo_obra: string;
  estado_actual: string;
  categoria_id: number | null;
  creado_en: string;
}

interface ReporteDeGrupoCrudo {
  id: number;
  gravedad: string;
}

export interface SugerenciaHechosDto {
  reporte_id: number;
  nearby_report_ids?: number[];
  nearby_group_ids?: number[];
}

export interface DuplicadoSugerido {
  reporte_id: number;
  es_mismo_problema: boolean;
  justificacion: string;
}

export interface PerteneceAObraSugerido {
  grupo_id: number;
  pertenece: boolean;
  justificacion: string;
}

export interface SugerenciaHechosResultado {
  ubicacion_sensible: UbicacionSensible;
  palabra_clave_riesgo: boolean;
  parece_lluvia: boolean;
  duplicados: DuplicadoSugerido[];
  pertenece_a_obra: PerteneceAObraSugerido | null;
  justificacion_breve: string;
}

/** Forma esperada del JSON que le pedimos al modelo de visión. */
interface RespuestaVision {
  ubicacion_sensible?: string;
  palabra_clave_riesgo?: boolean;
  parece_lluvia?: boolean;
  duplicados?: { reporte_id?: number; es_mismo_problema?: boolean; justificacion?: string }[];
  pertenece_a_obra?: { grupo_id?: number; pertenece?: boolean; justificacion?: string } | null;
  justificacion_breve?: string;
}

interface ObraContexto {
  grupo_id: number;
  codigo_obra: string;
  categoria: string;
  estado: string;
  antiguedad_dias: number;
  reportes_incluidos: { id: number; gravedad: string }[];
}

/**
 * Botón "Analizar foto" del backoffice: le pide al modelo de visión de Groq
 * que mire la foto del reporte (y las de los cercanos) y sugiera los 3 hechos
 * de criterio humano del triaje + si es un duplicado de otro reporte pendiente
 * o si pertenece a una obra ya activa cerca. Nunca decide la gravedad ni
 * fusiona/asigna nada — solo prellena el formulario que el moderador termina
 * de confirmar o corregir.
 */
@Injectable()
export class SugerenciaHechosService {
  private readonly logger = new Logger(SugerenciaHechosService.name);

  constructor(
    @Inject('MS_ADMIN') private readonly admin: ClientProxy,
    @Inject('MS_REGISTER') private readonly register: ClientProxy,
    private readonly providers: AiProviderRegistry,
  ) {}

  async sugerir(dto: SugerenciaHechosDto): Promise<SugerenciaHechosResultado> {
    const reporteId = Number(dto?.reporte_id);
    const cercanosIds = (dto.nearby_report_ids ?? [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id !== reporteId)
      .slice(0, MAX_CERCANOS);
    const gruposIds = (dto.nearby_group_ids ?? [])
      .map(Number)
      .filter((id) => Number.isInteger(id))
      .slice(0, MAX_OBRAS);

    const [reporte, imagenPrincipal] = await Promise.all([
      sendRpc<ReporteCrudo>(
        this.register.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: reporteId }),
      ),
      sendRpc<ImagenCruda>(this.register.send(TCP_PATTERNS.REGISTER.GET_IMAGEN, reporteId)),
    ]);

    const [cercanos, obras] = await Promise.all([
      this.cargarCercanos(cercanosIds),
      this.cargarObras(gruposIds),
    ]);

    const imagenes: AiImagen[] = [
      { base64: imagenPrincipal.data, contentType: imagenPrincipal.contentType },
      ...cercanos.map((c) => ({ base64: c.img.data, contentType: c.img.contentType })),
    ];

    const prompt = this.armarPrompt(
      reporteId,
      tipoDesdeCategoria(reporte.categoria_id),
      cercanos,
      obras,
    );
    const contentCrudo = await this.providers.chatConImagenes(prompt, imagenes);

    return this.parsearRespuesta(
      contentCrudo,
      cercanos.map((c) => c.id),
      obras.map((o) => o.grupo_id),
    );
  }

  private async cargarCercanos(
    ids: number[],
  ): Promise<{ id: number; tipo: string; img: ImagenCruda }[]> {
    const cercanos = await Promise.all(
      ids.map(async (id) => {
        try {
          const [r, img] = await Promise.all([
            sendRpc<ReporteCrudo>(
              this.register.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: id }),
            ),
            sendRpc<ImagenCruda>(this.register.send(TCP_PATTERNS.REGISTER.GET_IMAGEN, id)),
          ]);
          return { id, tipo: tipoDesdeCategoria(r.categoria_id), img };
        } catch {
          return null;
        }
      }),
    );
    return cercanos.filter((c): c is NonNullable<typeof c> => c !== null);
  }

  /** Contexto textual de obras cercanas — sin fotos, para no gastar el limite de imagenes de Groq. */
  private async cargarObras(ids: number[]): Promise<ObraContexto[]> {
    const obras = await Promise.all(
      ids.map(async (id) => {
        try {
          const [grupo, reportes] = await Promise.all([
            sendRpc<GrupoCrudo>(this.admin.send(TCP_PATTERNS.ADMIN.GET_GROUP, { grupo_id: id })),
            sendRpc<ReporteDeGrupoCrudo[]>(
              this.admin.send(TCP_PATTERNS.ADMIN.LIST_GROUP_REPORTS, { grupo_id: id }),
            ),
          ]);
          const antiguedadDias = Math.floor(
            (Date.now() - new Date(grupo.creado_en).getTime()) / 86_400_000,
          );
          return {
            grupo_id: grupo.id,
            codigo_obra: grupo.codigo_obra,
            categoria: tipoDesdeCategoria(grupo.categoria_id ?? 0),
            estado: grupo.estado_actual,
            antiguedad_dias: antiguedadDias,
            reportes_incluidos: (reportes ?? []).map((r) => ({ id: r.id, gravedad: r.gravedad })),
          };
        } catch {
          return null;
        }
      }),
    );
    return obras.filter((o): o is NonNullable<typeof o> => o !== null);
  }

  private armarPrompt(
    reporteId: number,
    tipo: string,
    cercanos: { id: number; tipo: string }[],
    obras: ObraContexto[],
  ): string {
    const contexto = {
      reporte_principal: { id: reporteId, categoria: tipo },
      reportes_cercanos: cercanos.map((c) => ({ reporte_id: c.id, categoria: c.tipo })),
      obras_cercanas: obras.map((o) => ({
        grupo_id: o.grupo_id,
        codigo_obra: o.codigo_obra,
        categoria: o.categoria,
        estado: o.estado,
        antiguedad_dias: o.antiguedad_dias,
        reportes_incluidos: o.reportes_incluidos,
      })),
    };

    return `Sos un asistente que ayuda a un moderador de Ojo Camba (plataforma de reportes de infraestructura urbana en Santa Cruz de la Sierra, Bolivia) a revisar un reporte ciudadano.

La primera imagen adjunta es la foto del reporte bajo revisión. Las siguientes imágenes (si las hay) son de reportes cercanos pendientes, para que compares si muestran el MISMO problema físico real. Además tenés este contexto (las obras cercanas NO tienen foto adjunta, son casos ya en gestión, solo tenés su info):

${JSON.stringify(contexto, null, 2)}

Mirá la primera imagen y respondé SOLO un JSON con esta forma exacta, sin texto adicional:
{
  "ubicacion_sensible": "ninguna" | "via_principal" | "escuela" | "hospital",
  "palabra_clave_riesgo": boolean,
  "parece_lluvia": boolean,
  "duplicados": [{ "reporte_id": number, "es_mismo_problema": boolean, "justificacion": "..." }],
  "pertenece_a_obra": { "grupo_id": number, "pertenece": boolean, "justificacion": "..." } | null,
  "justificacion_breve": "..."
}

Guía:
- "ubicacion_sensible": elegí "via_principal" si se ve una calle/avenida principal de tránsito pesado, "escuela" u "hospital" si hay señalización o el contexto lo sugiere, si no "ninguna".
- "palabra_clave_riesgo": true solo si la foto muestra un riesgo claro (hundimiento profundo, cable eléctrico caído, colapso estructural, persona herida). No exageres.
- "parece_lluvia": true solo si se ve lluvia cayendo, charcos, agua estancada o pavimento visiblemente mojado.
- "duplicados": para cada reporte cercano en reportes_cercanos, decidí si su imagen muestra el mismo problema físico que el reporte bajo revisión (mismo bache, mismo cable, mismo lugar) y no un problema distinto que casualmente está cerca. Array vacío si no hay reportes cercanos.
- "pertenece_a_obra": para cada obra en obras_cercanas, marcá pertenece:true SOLO si el reporte bajo revisión es el MISMO problema físico que ya está siendo atendido en esa obra (mismo lugar, mismo tipo de daño) — no alcanza con que sea de la misma categoría en la zona. Si ninguna obra coincide, o no hay obras cercanas, respondé null. Elegí como mucho UNA obra (la más probable), nunca inventes un grupo_id que no esté en obras_cercanas.
- No inventes certeza que no tenés: si algo no es claro, preferí "false"/"ninguna"/null antes que adivinar.`;
  }

  private parsearRespuesta(
    crudo: string,
    idsCercanosValidos: number[],
    idsObrasValidas: number[],
  ): SugerenciaHechosResultado {
    const fallback: SugerenciaHechosResultado = {
      ubicacion_sensible: 'ninguna',
      palabra_clave_riesgo: false,
      parece_lluvia: false,
      duplicados: [],
      pertenece_a_obra: null,
      justificacion_breve: 'No se pudo interpretar la respuesta de la IA.',
    };

    const match = crudo.match(/\{[\s\S]*\}/);
    if (!match) {
      this.logger.warn(`Respuesta de visión sin JSON: ${crudo.slice(0, 200)}`);
      return fallback;
    }

    let parsed: RespuestaVision;
    try {
      parsed = JSON.parse(match[0]) as RespuestaVision;
    } catch {
      this.logger.warn(`JSON invalido en respuesta de visión: ${match[0].slice(0, 200)}`);
      return fallback;
    }

    const idsCercanosSet = new Set(idsCercanosValidos);
    const duplicados: DuplicadoSugerido[] = Array.isArray(parsed.duplicados)
      ? parsed.duplicados
          .filter(
            (d) => Number.isInteger(d?.reporte_id) && idsCercanosSet.has(d.reporte_id as number),
          )
          .map((d) => ({
            reporte_id: d.reporte_id as number,
            es_mismo_problema: d.es_mismo_problema === true,
            justificacion: typeof d.justificacion === 'string' ? d.justificacion : '',
          }))
      : [];

    // Anti-alucinacion: solo se acepta un grupo_id que realmente se le paso como obra cercana.
    const idsObrasSet = new Set(idsObrasValidas);
    const perteneceCrudo = parsed.pertenece_a_obra;
    const perteneceAObra: PerteneceAObraSugerido | null =
      perteneceCrudo &&
      Number.isInteger(perteneceCrudo.grupo_id) &&
      idsObrasSet.has(perteneceCrudo.grupo_id as number)
        ? {
            grupo_id: perteneceCrudo.grupo_id as number,
            pertenece: perteneceCrudo.pertenece === true,
            justificacion:
              typeof perteneceCrudo.justificacion === 'string' ? perteneceCrudo.justificacion : '',
          }
        : null;

    return {
      ubicacion_sensible: UBICACIONES.includes(parsed.ubicacion_sensible as UbicacionSensible)
        ? (parsed.ubicacion_sensible as UbicacionSensible)
        : 'ninguna',
      palabra_clave_riesgo: parsed.palabra_clave_riesgo === true,
      parece_lluvia: parsed.parece_lluvia === true,
      duplicados,
      pertenece_a_obra: perteneceAObra,
      justificacion_breve:
        typeof parsed.justificacion_breve === 'string' ? parsed.justificacion_breve : '',
    };
  }
}

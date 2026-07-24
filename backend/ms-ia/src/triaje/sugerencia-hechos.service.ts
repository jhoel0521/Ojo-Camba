import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS, tipoDesdeCategoria, type UbicacionSensible } from '@ojo-camba/common';
import { sendRpc } from '../rpc.helper';
import { GroqProvider, type AiImagen } from '../ai/groq.provider';

const UBICACIONES: UbicacionSensible[] = ['ninguna', 'via_principal', 'escuela', 'hospital'];
/** Groq acepta hasta 5 imágenes por request: 1 del reporte + hasta 4 cercanos. */
const MAX_CERCANOS = 4;

interface ReporteCrudo {
  id: number;
  categoria_id: number;
}

interface ImagenCruda {
  data: string;
  contentType: string;
}

export interface SugerenciaHechosDto {
  reporte_id: number;
  nearby_report_ids?: number[];
}

export interface DuplicadoSugerido {
  reporte_id: number;
  es_mismo_problema: boolean;
  justificacion: string;
}

export interface SugerenciaHechosResultado {
  ubicacion_sensible: UbicacionSensible;
  palabra_clave_riesgo: boolean;
  parece_lluvia: boolean;
  duplicados: DuplicadoSugerido[];
  justificacion_breve: string;
}

/** Forma esperada del JSON que le pedimos al modelo de visión. */
interface RespuestaVision {
  ubicacion_sensible?: string;
  palabra_clave_riesgo?: boolean;
  parece_lluvia?: boolean;
  duplicados?: { reporte_id?: number; es_mismo_problema?: boolean; justificacion?: string }[];
  justificacion_breve?: string;
}

/**
 * Botón "Analizar foto" del backoffice: le pide al modelo de visión de Groq
 * que mire la foto del reporte (y las de los cercanos) y sugiera los 3 hechos
 * de criterio humano del triaje + candidatos a duplicado. Nunca decide la
 * gravedad ni fusiona reportes — solo prellena el formulario que el moderador
 * termina de confirmar o corregir.
 */
@Injectable()
export class SugerenciaHechosService {
  private readonly logger = new Logger(SugerenciaHechosService.name);

  constructor(
    @Inject('MS_REGISTER') private readonly register: ClientProxy,
    private readonly groq: GroqProvider,
  ) {}

  async sugerir(dto: SugerenciaHechosDto): Promise<SugerenciaHechosResultado> {
    const reporteId = Number(dto?.reporte_id);
    const cercanosIds = (dto.nearby_report_ids ?? [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id !== reporteId)
      .slice(0, MAX_CERCANOS);

    const [reporte, imagenPrincipal] = await Promise.all([
      sendRpc<ReporteCrudo>(
        this.register.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: reporteId }),
      ),
      sendRpc<ImagenCruda>(this.register.send(TCP_PATTERNS.REGISTER.GET_IMAGEN, reporteId)),
    ]);

    const cercanos = await Promise.all(
      cercanosIds.map(async (id) => {
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
    const cercanosOk = cercanos.filter((c): c is NonNullable<typeof c> => c !== null);

    const imagenes: AiImagen[] = [
      { base64: imagenPrincipal.data, contentType: imagenPrincipal.contentType },
      ...cercanosOk.map((c) => ({ base64: c.img.data, contentType: c.img.contentType })),
    ];

    const prompt = this.armarPrompt(
      reporteId,
      tipoDesdeCategoria(reporte.categoria_id),
      cercanosOk,
    );
    const contentCrudo = await this.groq.chatConImagenes(prompt, imagenes);

    return this.parsearRespuesta(
      contentCrudo,
      cercanosOk.map((c) => c.id),
    );
  }

  private armarPrompt(
    reporteId: number,
    tipo: string,
    cercanos: { id: number; tipo: string }[],
  ): string {
    const listaCercanos =
      cercanos.length > 0
        ? cercanos.map((c) => `- Imagen del reporte #${c.id} (categoría: ${c.tipo})`).join('\n')
        : '(no hay reportes cercanos con foto para comparar)';

    return `Sos un asistente que ayuda a un moderador de Ojo Camba (plataforma de reportes de infraestructura urbana en Santa Cruz de la Sierra, Bolivia) a revisar un reporte ciudadano.

La primera imagen es la foto del reporte #${reporteId} (categoría: ${tipo}), bajo revisión. Las siguientes imágenes (si las hay) son de reportes cercanos, para que compares si muestran el MISMO problema físico real:
${listaCercanos}

Mirá la primera imagen y respondé SOLO un JSON con esta forma exacta, sin texto adicional:
{
  "ubicacion_sensible": "ninguna" | "via_principal" | "escuela" | "hospital",
  "palabra_clave_riesgo": boolean,
  "parece_lluvia": boolean,
  "duplicados": [{ "reporte_id": number, "es_mismo_problema": boolean, "justificacion": "..." }],
  "justificacion_breve": "..."
}

Guía:
- "ubicacion_sensible": elegí "via_principal" si se ve una calle/avenida principal de tránsito pesado, "escuela" u "hospital" si hay señalización o el contexto lo sugiere, si no "ninguna".
- "palabra_clave_riesgo": true solo si la foto muestra un riesgo claro (hundimiento profundo, cable eléctrico caído, colapso estructural, persona herida). No exageres.
- "parece_lluvia": true solo si se ve lluvia cayendo, charcos, agua estancada o pavimento visiblemente mojado.
- "duplicados": para cada reporte cercano, decidí si su imagen muestra el mismo problema físico que el reporte #${reporteId} (mismo bache, mismo cable, mismo lugar) y no un problema distinto que casualmente está cerca. Si no hay reportes cercanos, devolvé un array vacío.
- No inventes certeza que no tenés: si una imagen no es clara, preferí "false"/"ninguna" antes que adivinar.`;
  }

  private parsearRespuesta(crudo: string, idsCercanosValidos: number[]): SugerenciaHechosResultado {
    const fallback: SugerenciaHechosResultado = {
      ubicacion_sensible: 'ninguna',
      palabra_clave_riesgo: false,
      parece_lluvia: false,
      duplicados: [],
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

    const idsValidosSet = new Set(idsCercanosValidos);
    const duplicados: DuplicadoSugerido[] = Array.isArray(parsed.duplicados)
      ? parsed.duplicados
          .filter(
            (d) => Number.isInteger(d?.reporte_id) && idsValidosSet.has(d.reporte_id as number),
          )
          .map((d) => ({
            reporte_id: d.reporte_id as number,
            es_mismo_problema: d.es_mismo_problema === true,
            justificacion: typeof d.justificacion === 'string' ? d.justificacion : '',
          }))
      : [];

    return {
      ubicacion_sensible: UBICACIONES.includes(parsed.ubicacion_sensible as UbicacionSensible)
        ? (parsed.ubicacion_sensible as UbicacionSensible)
        : 'ninguna',
      palabra_clave_riesgo: parsed.palabra_clave_riesgo === true,
      parece_lluvia: parsed.parece_lluvia === true,
      duplicados,
      justificacion_breve:
        typeof parsed.justificacion_breve === 'string' ? parsed.justificacion_breve : '',
    };
  }
}

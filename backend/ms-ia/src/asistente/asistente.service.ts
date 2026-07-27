import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiProviderRegistry } from '../ai/ai-provider.registry';
import { AsistenteToolkit } from './asistente.toolkit';
import type { AiMessage } from '../ai/ai-provider';

export interface TurnoHistorial {
  role: 'user' | 'assistant';
  content: string;
}

export interface AsistenteChatDto {
  message: string;
  history?: TurnoHistorial[];
}

export interface AsistenteChatRespuesta {
  reply: string;
  redirect?: string;
  history: TurnoHistorial[];
}

// Cortes de seguridad del loop de agente.
const MAX_PASOS = 6;
const MAX_HISTORIAL = 14;

/**
 * Asistente conversacional de Ojo Camba (patrón de agente con herramientas de
 * ISABEL2). El LLM es la puerta de lenguaje natural: interpreta al operador y
 * decide qué herramientas usar. El razonamiento del dominio vive en el motor
 * simbólico (reglas de triaje y búsqueda de ruta) que exponen las herramientas.
 */
@Injectable()
export class AsistenteService {
  private readonly logger = new Logger(AsistenteService.name);

  constructor(
    private readonly providers: AiProviderRegistry,
    private readonly toolkit: AsistenteToolkit,
  ) {}

  async chat(dto: AsistenteChatDto): Promise<AsistenteChatRespuesta> {
    const mensaje = (dto?.message ?? '').trim();
    if (!mensaje) throw new BadRequestException('El campo "message" es requerido.');

    const historialEntrada = this.limpiarHistorial(dto.history);
    const system = this.buildSystemPrompt();

    // Contexto interno del loop (incluye turnos de herramienta); no se persiste.
    const messages: AiMessage[] = [
      ...historialEntrada.map((t) => ({ role: t.role, content: t.content }) as AiMessage),
      { role: 'user', content: mensaje },
    ];

    let redirect: string | undefined;

    for (let paso = 0; paso < MAX_PASOS; paso++) {
      const { message: asistente } = await this.providers.chat({
        system,
        messages,
        tools: this.toolkit.definitions(),
      });
      messages.push(asistente);

      if (!asistente.toolCalls?.length) {
        return {
          reply: asistente.content || 'No tengo una respuesta para eso.',
          redirect,
          history: this.armarHistorialSalida(historialEntrada, mensaje, asistente.content),
        };
      }

      // Ejecuta cada herramienta pedida y devuelve su resultado al modelo.
      for (const call of asistente.toolCalls) {
        let resultado: Record<string, unknown>;
        try {
          resultado = await this.toolkit.execute(call.name, call.arguments);
        } catch (e) {
          this.logger.warn(`Herramienta ${call.name} falló: ${String(e)}`);
          resultado = { error: 'La herramienta no pudo completarse.' };
        }
        if (typeof resultado.redirect === 'string') redirect = resultado.redirect;
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify(resultado),
        });
      }
    }

    // Se agotaron los pasos sin respuesta final del modelo.
    this.logger.warn('El asistente agotó el máximo de pasos sin respuesta final.');
    return {
      reply: 'No pude completar la consulta en este intento. ¿Podés reformularla?',
      redirect,
      history: this.armarHistorialSalida(historialEntrada, mensaje, ''),
    };
  }

  private buildSystemPrompt(): string {
    const hoy = new Date().toISOString().slice(0, 10);
    return `Sos el asistente del Back Office de Ojo Camba, plataforma ciudadana de reporte de infraestructura urbana en Santa Cruz de la Sierra. Hoy es ${hoy}.

Cómo trabajás:
- Sos la puerta de lenguaje natural. El razonamiento del dominio lo hace el sistema experto (reglas de triaje y búsqueda de ruta); vos interpretás al operador y USÁS las herramientas para obtener datos reales o explicaciones. No describas lo que habría que hacer: hacelo llamando a la herramienta.
- Nunca inventes cifras, IDs, nombres ni estados. Si un dato no vino de una herramienta, decí que no lo tenés.
- Cuando expliques un triaje o una ruta, apoyate en la traza que devuelve la herramienta (reglas disparadas / orden calculado). No inventes la gravedad ni el orden.
- Vos no decidís por el operador: sugerís y dejás la decisión final en sus manos.
- Respondé en español rioplatense-boliviano, claro y breve, sin jerga técnica (nada de "estados explorados", "backtracking", "nodos", "forward chaining").

Herramientas disponibles: resumen_pendientes, listar_casos, explicar_triaje, explicar_ruta, recomendar_cuadrilla, navegar. Usalas cuando correspondan en vez de suponer.`;
  }

  private limpiarHistorial(history: TurnoHistorial[] | undefined): TurnoHistorial[] {
    if (!Array.isArray(history)) return [];
    return history
      .filter(
        (t): t is TurnoHistorial =>
          t != null &&
          (t.role === 'user' || t.role === 'assistant') &&
          typeof t.content === 'string' &&
          t.content.trim().length > 0,
      )
      .slice(-MAX_HISTORIAL);
  }

  private armarHistorialSalida(
    entrada: TurnoHistorial[],
    mensajeUsuario: string,
    respuesta: string,
  ): TurnoHistorial[] {
    return [
      ...entrada,
      { role: 'user' as const, content: mensajeUsuario },
      { role: 'assistant' as const, content: respuesta },
    ].slice(-MAX_HISTORIAL);
  }
}

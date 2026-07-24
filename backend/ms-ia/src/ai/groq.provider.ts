import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { AiChatParams, AiChatResult, AiMessage, AiProvider, AiToolCall } from './ai-provider';

/** Formato de mensaje que espera la API OpenAI-compatible de Groq. */
interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface GroqChatResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: {
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
}

/** Una imagen para mandarle al modelo de visión, ya en base64. */
export interface AiImagen {
  base64: string;
  contentType: string;
}

/**
 * Proveedor Groq: llama al endpoint OpenAI-compatible via fetch nativo. La
 * GROQ_API_KEY se lee solo del entorno del backend; nunca llega al frontend.
 */
@Injectable()
export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqProvider.name);

  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  private readonly visionModel = process.env.GROQ_VISION_MODEL ?? 'qwen/qwen3.6-27b';
  private readonly baseUrl = process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1';

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Manda un prompt de texto junto a una o más imágenes al modelo de visión de
   * Groq y devuelve el `content` crudo (se espera JSON, lo parsea quien llama).
   * Método aparte de `chat()`: el asistente conversacional (texto) sigue usando
   * el modelo normal; solo `SugerenciaHechosService` usa este.
   */
  async chatConImagenes(prompt: string, imagenes: AiImagen[]): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'El asistente no está configurado: falta GROQ_API_KEY en el servidor.',
      );
    }

    const content = [
      { type: 'text', text: prompt },
      ...imagenes.map((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.contentType};base64,${img.base64}` },
      })),
    ];

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.visionModel,
          temperature: 0.2,
          max_tokens: 600,
          // qwen3.6 es un modelo "thinking": sin esto gasta el max_tokens entero
          // razonando en un bloque <think> y nunca llega a escribir el JSON.
          reasoning_effort: 'none',
          messages: [{ role: 'user', content }],
        }),
      });
    } catch (e) {
      this.logger.error(`Fallo de red al contactar al modelo de visión de Groq: ${String(e)}`);
      throw new ServiceUnavailableException(
        'No se pudo contactar al servicio de IA. Intentá de nuevo en unos minutos.',
      );
    }

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      this.logger.error(`Groq (visión) respondió ${res.status}: ${detalle}`);
      throw new ServiceUnavailableException(
        res.status === 429
          ? 'El servicio de IA alcanzó su cuota por ahora. Intentá de nuevo en unos minutos.'
          : 'El servicio de IA no está disponible en este momento.',
      );
    }

    const data = (await res.json()) as GroqChatResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }

  async chat(params: AiChatParams): Promise<AiChatResult> {
    const messages: OpenAiMessage[] = [
      { role: 'system', content: params.system },
      ...params.messages.map((m) => this.toOpenAi(m)),
    ];

    // OpenAI/Groq envuelve cada herramienta en un objeto `function`.
    const tools = params.tools.map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_tokens: 700,
          messages,
          ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        }),
      });
    } catch (e) {
      this.logger.error(`Fallo de red al contactar a Groq: ${String(e)}`);
      throw new ServiceUnavailableException(
        'No se pudo contactar al servicio de IA. Intentá de nuevo en unos minutos.',
      );
    }

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      this.logger.error(`Groq respondió ${res.status}: ${detalle}`);
      throw new ServiceUnavailableException(
        res.status === 429
          ? 'El servicio de IA alcanzó su cuota por ahora. Intentá de nuevo en unos minutos.'
          : 'El servicio de IA no está disponible en este momento.',
      );
    }

    const data = (await res.json()) as GroqChatResponse;
    const choice = data.choices?.[0]?.message;

    const toolCalls: AiToolCall[] = (choice?.tool_calls ?? [])
      .filter((c) => c.function?.name)
      .map((c) => ({
        id: c.id ?? `${c.function?.name}-${Math.random().toString(36).slice(2)}`,
        name: c.function?.name as string,
        arguments: this.parseArgs(c.function?.arguments),
      }));

    return {
      message: {
        role: 'assistant',
        content: choice?.content ?? '',
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      },
    };
  }

  private toOpenAi(m: AiMessage): OpenAiMessage {
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      // A cada herramienta se le responde luego con un mensaje `tool` suelto.
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.arguments) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  }

  private parseArgs(raw: string | undefined): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}

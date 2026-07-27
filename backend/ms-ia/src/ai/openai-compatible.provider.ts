import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiChatParams,
  AiChatResult,
  AiImagen,
  AiMessage,
  AiProvider,
  AiProviderSettings,
  AiToolCall,
} from './ai-provider';

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null | unknown[];
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface OpenAiResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
    };
  }[];
}

/** Base para APIs compatibles con OpenAI: Groq, DeepSeek y OpenAI. */
export abstract class OpenAiCompatibleProvider implements AiProvider {
  abstract readonly name: string;
  abstract readonly supportsVision: boolean;
  protected readonly logger = new Logger(OpenAiCompatibleProvider.name);

  async chat(settings: AiProviderSettings, params: AiChatParams): Promise<AiChatResult> {
    const messages: OpenAiMessage[] = [
      { role: 'system', content: params.system },
      ...params.messages.map((message) => this.toOpenAi(message)),
    ];
    const tools = params.tools.map((tool) => ({
      type: 'function' as const,
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
    const data = await this.post<OpenAiResponse>(settings, '/chat/completions', {
      model: settings.textModel,
      temperature: 0.3,
      max_tokens: 700,
      messages,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    });
    const choice = data.choices?.[0]?.message;
    const toolCalls: AiToolCall[] = (choice?.tool_calls ?? [])
      .filter((call) => call.function?.name)
      .map((call) => ({
        id: call.id ?? `${call.function?.name}-${Math.random().toString(36).slice(2)}`,
        name: call.function?.name as string,
        arguments: this.parseArgs(call.function?.arguments),
      }));
    return {
      message: {
        role: 'assistant',
        content: choice?.content ?? '',
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      },
    };
  }

  async chatConImagenes(
    settings: AiProviderSettings,
    prompt: string,
    imagenes: AiImagen[],
  ): Promise<string> {
    if (!this.supportsVision || !settings.visionModel) {
      throw new ServiceUnavailableException(
        `${this.name} no está configurado para análisis de imágenes.`,
      );
    }
    const content = [
      { type: 'text', text: prompt },
      ...imagenes.map((image) => ({
        type: 'image_url',
        image_url: { url: `data:${image.contentType};base64,${image.base64}` },
      })),
    ];
    const data = await this.post<OpenAiResponse>(settings, '/chat/completions', {
      model: settings.visionModel,
      temperature: 0.2,
      max_tokens: 600,
      ...(this.name === 'groq' ? { reasoning_effort: 'none' } : {}),
      messages: [{ role: 'user', content }],
    });
    return data.choices?.[0]?.message?.content ?? '';
  }

  protected async post<T>(settings: AiProviderSettings, path: string, body: unknown): Promise<T> {
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`${this.name} no respondió: ${String(error)}`);
      throw new ServiceUnavailableException(`${this.name} no está disponible temporalmente.`);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.warn(`${this.name} respondió ${response.status}: ${detail.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        response.status === 429
          ? `${this.name} alcanzó su cuota temporalmente.`
          : `${this.name} no está disponible temporalmente.`,
      );
    }
    return response.json() as Promise<T>;
  }

  private toOpenAi(message: AiMessage): OpenAiMessage {
    if (message.role === 'tool') {
      return { role: 'tool', content: message.content, tool_call_id: message.toolCallId };
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      };
    }
    return { role: message.role, content: message.content };
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

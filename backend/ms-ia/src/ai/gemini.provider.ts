import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiChatParams,
  AiChatResult,
  AiImagen,
  AiMessage,
  AiProvider,
  AiProviderSettings,
  AiToolCall,
} from './ai-provider';

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: { name?: string; args?: Record<string, unknown> };
      }>;
    };
  }[];
}

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly supportsVision = true;
  private readonly logger = new Logger(GeminiProvider.name);

  async chat(settings: AiProviderSettings, params: AiChatParams): Promise<AiChatResult> {
    const data = await this.generate(settings, settings.textModel, {
      systemInstruction: { parts: [{ text: params.system }] },
      contents: params.messages.map((message) => this.toGemini(message)),
      tools: [
        {
          functionDeclarations: params.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
    });
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const calls: AiToolCall[] = parts
      .filter((part) => part.functionCall?.name)
      .map((part) => ({
        id: `${part.functionCall?.name}-${Math.random().toString(36).slice(2)}`,
        name: part.functionCall?.name as string,
        arguments: part.functionCall?.args ?? {},
      }));
    return {
      message: {
        role: 'assistant',
        content: parts.map((part) => part.text ?? '').join(''),
        ...(calls.length ? { toolCalls: calls } : {}),
      },
    };
  }

  async chatConImagenes(
    settings: AiProviderSettings,
    prompt: string,
    imagenes: AiImagen[],
  ): Promise<string> {
    const data = await this.generate(settings, settings.visionModel, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...imagenes.map((image) => ({
              inlineData: { mimeType: image.contentType, data: image.base64 },
            })),
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
    });
    return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('');
  }

  private async generate(
    settings: AiProviderSettings,
    model: string | null,
    body: unknown,
  ): Promise<GeminiResponse> {
    if (!model)
      throw new ServiceUnavailableException(
        'Gemini no tiene un modelo configurado para esta función.',
      );
    const baseUrl = settings.baseUrl.replace(/\/$/, '');
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(
        `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
    } catch (error) {
      this.logger.error(`Gemini no respondió: ${String(error)}`);
      throw new ServiceUnavailableException('Gemini no está disponible temporalmente.');
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.warn(`Gemini respondió ${response.status}: ${detail.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        response.status === 429
          ? 'Gemini alcanzó su cuota temporalmente.'
          : 'Gemini no está disponible temporalmente.',
      );
    }
    return response.json() as Promise<GeminiResponse>;
  }

  private toGemini(message: AiMessage) {
    if (message.role === 'tool') {
      let response: Record<string, unknown>;
      try {
        response = JSON.parse(message.content) as Record<string, unknown>;
      } catch {
        response = { result: message.content };
      }
      return { role: 'user', parts: [{ functionResponse: { name: message.name, response } }] };
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'model',
        parts: message.toolCalls.map((call) => ({
          functionCall: { name: call.name, args: call.arguments },
        })),
      };
    }
    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    };
  }
}

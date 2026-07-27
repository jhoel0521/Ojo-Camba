import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiChatParams,
  AiChatResult,
  AiImagen,
  AiProvider,
  AiProviderSettings,
} from './ai-provider';
import { AiConfigurationService } from './ai-configuration.service';
import { DeepSeekProvider } from './deepseek.provider';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { OpenAiProvider } from './openai.provider';

/**
 * Selecciona proveedores por prioridad persistida. Cada petición consulta la
 * configuración vigente, por lo que cambiar clave, modelo o respaldo no exige
 * reiniciar el microservicio.
 */
@Injectable()
export class AiProviderRegistry {
  private readonly logger = new Logger(AiProviderRegistry.name);
  private readonly providers: AiProvider[];

  constructor(
    private readonly configuration: AiConfigurationService,
    groq: GroqProvider,
    gemini: GeminiProvider,
    deepseek: DeepSeekProvider,
    openai: OpenAiProvider,
  ) {
    this.providers = [groq, gemini, deepseek, openai];
  }

  async chat(params: AiChatParams): Promise<AiChatResult> {
    return this.withFallback('text', (provider, settings) => provider.chat(settings, params));
  }

  async chatConImagenes(prompt: string, imagenes: AiImagen[]): Promise<string> {
    return this.withFallback('vision', (provider, settings) => {
      if (!provider.chatConImagenes) {
        throw new ServiceUnavailableException(`${provider.name} no admite análisis visual.`);
      }
      return provider.chatConImagenes(settings, prompt, imagenes);
    });
  }

  async test(providerName: string): Promise<{ ok: boolean; provider: string; message: string }> {
    const settings = (await this.configuration.getEnabled('text')).find(
      (candidate) => candidate.provider === providerName,
    );
    const provider = this.providers.find((candidate) => candidate.name === providerName);
    if (!settings || !provider) {
      return {
        ok: false,
        provider: providerName,
        message: 'Debe estar activado y tener clave antes de probarlo.',
      };
    }
    try {
      await provider.chat(settings, {
        system: 'Respondé solamente: OK',
        messages: [{ role: 'user', content: 'ping' }],
        tools: [],
      });
      return { ok: true, provider: providerName, message: 'Conexión validada.' };
    } catch (error) {
      this.logger.warn(`Prueba de ${providerName} falló: ${String(error)}`);
      return {
        ok: false,
        provider: providerName,
        message: 'No se pudo validar el proveedor. Revisá clave, URL, modelo y cuota.',
      };
    }
  }

  private async withFallback<T>(
    modality: 'text' | 'vision',
    operation: (provider: AiProvider, settings: AiProviderSettings) => Promise<T>,
  ): Promise<T> {
    const configured = await this.configuration.getEnabled(modality);
    const candidates = configured
      .map((settings) => ({
        settings,
        provider: this.providers.find((item) => item.name === settings.provider),
      }))
      .filter(
        (item): item is { settings: AiProviderSettings; provider: AiProvider } =>
          Boolean(item.provider) && (modality === 'text' || item.provider?.supportsVision === true),
      );
    if (!candidates.length) {
      throw new ServiceUnavailableException(
        `No hay proveedor de IA ${modality === 'vision' ? 'visual' : 'de texto'} configurado.`,
      );
    }
    for (const { provider, settings } of candidates) {
      try {
        return await operation(provider, settings);
      } catch {
        this.logger.warn(
          `${provider.name} falló para ${modality}; se intentará el siguiente respaldo.`,
        );
      }
    }
    throw new ServiceUnavailableException(
      'Todos los proveedores de IA configurados están temporalmente no disponibles.',
    );
  }
}

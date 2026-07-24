import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { AiProvider } from './ai-provider';
import { GroqProvider } from './groq.provider';

/**
 * Registro de proveedores de LLM (patrón AiProviderRegistry de ISABEL2).
 * Hoy solo hay Groq; sumar otro es registrarlo acá y elegirlo por nombre.
 */
@Injectable()
export class AiProviderRegistry {
  private readonly providers: AiProvider[];

  constructor(groq: GroqProvider) {
    this.providers = [groq];
  }

  /** Devuelve el proveedor pedido (o el primero configurado por defecto). */
  get(name?: string): AiProvider {
    const elegido = name
      ? this.providers.find((p) => p.name === name)
      : (this.providers.find((p) => p.isConfigured()) ?? this.providers[0]);

    if (!elegido) {
      throw new InternalServerErrorException('No hay ningún proveedor de IA registrado.');
    }
    return elegido;
  }
}

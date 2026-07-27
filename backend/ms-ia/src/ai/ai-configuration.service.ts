import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AiProviderConfig, type AiProviderName } from '@ojo-camba/common';
import { Repository } from 'typeorm';
import type { AiProviderSettings } from './ai-provider';
import { AiCredentialCipher } from './ai-credential-cipher.service';

const PROVIDER_DEFAULTS: Record<
  AiProviderName,
  Omit<AiProviderConfig, 'id' | 'creado_en' | 'actualizado_en' | 'api_key_encrypted'>
> = {
  groq: {
    provider: 'groq',
    enabled: true,
    priority: 10,
    base_url: 'https://api.groq.com/openai/v1',
    text_model: 'llama-3.3-70b-versatile',
    vision_model: 'qwen/qwen3.6-27b',
  },
  gemini: {
    provider: 'gemini',
    enabled: false,
    priority: 20,
    base_url: 'https://generativelanguage.googleapis.com/v1beta',
    text_model: 'gemini-3.5-flash-lite',
    vision_model: 'gemini-3.5-flash-lite',
  },
  deepseek: {
    provider: 'deepseek',
    enabled: false,
    priority: 30,
    base_url: 'https://api.deepseek.com',
    text_model: 'deepseek-chat',
    vision_model: null,
  },
  openai: {
    provider: 'openai',
    enabled: false,
    priority: 40,
    base_url: 'https://api.openai.com/v1',
    text_model: 'gpt-4o-mini',
    vision_model: 'gpt-4o-mini',
  },
};

export interface UpdateAiProviderConfigDto {
  enabled?: boolean;
  priority?: number;
  base_url?: string;
  text_model?: string | null;
  vision_model?: string | null;
  api_key?: string;
  clear_api_key?: boolean;
}

@Injectable()
export class AiConfigurationService implements OnModuleInit {
  constructor(
    @InjectRepository(AiProviderConfig)
    private readonly configs: Repository<AiProviderConfig>,
    private readonly cipher: AiCredentialCipher,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const provider of Object.keys(PROVIDER_DEFAULTS) as AiProviderName[]) {
      const exists = await this.configs.findOne({ where: { provider } });
      if (!exists) await this.configs.save(this.configs.create(PROVIDER_DEFAULTS[provider]));
    }
  }

  async list(): Promise<
    Array<Omit<AiProviderConfig, 'api_key_encrypted'> & { has_api_key: boolean }>
  > {
    const records = await this.configs.find({ order: { priority: 'ASC' } });
    return records.map(({ api_key_encrypted, ...config }) => ({
      ...config,
      has_api_key: Boolean(api_key_encrypted) || this.hasLegacyCredential(config.provider),
    }));
  }

  async update(provider: AiProviderName, dto: UpdateAiProviderConfigDto) {
    const config = await this.getRecord(provider);
    if (dto.priority !== undefined && (!Number.isInteger(dto.priority) || dto.priority < 1)) {
      throw new BadRequestException('priority debe ser un entero positivo.');
    }
    if (dto.base_url !== undefined && !this.isHttpUrl(dto.base_url)) {
      throw new BadRequestException('base_url debe ser una URL HTTP(S) válida.');
    }
    if (dto.api_key !== undefined) {
      const key = dto.api_key.trim();
      if (!key)
        throw new BadRequestException(
          'api_key no puede estar vacía; usá clear_api_key para eliminarla.',
        );
      config.api_key_encrypted = this.cipher.encrypt(key);
    }
    if (dto.clear_api_key === true) config.api_key_encrypted = null;
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.priority !== undefined) config.priority = dto.priority;
    if (dto.base_url !== undefined) config.base_url = dto.base_url.replace(/\/$/, '');
    if (dto.text_model !== undefined) config.text_model = dto.text_model?.trim() || null;
    if (dto.vision_model !== undefined) config.vision_model = dto.vision_model?.trim() || null;
    await this.configs.save(config);
    return this.publicConfig(config);
  }

  async getEnabled(modality: 'text' | 'vision'): Promise<AiProviderSettings[]> {
    const records = await this.configs.find({
      where: { enabled: true },
      order: { priority: 'ASC' },
    });
    return records.flatMap((config) => {
      const apiKey = this.getApiKey(config);
      const model = modality === 'text' ? config.text_model : config.vision_model;
      return apiKey && model
        ? [
            {
              provider: config.provider,
              apiKey,
              baseUrl: config.base_url,
              textModel: config.text_model,
              visionModel: config.vision_model,
            },
          ]
        : [];
    });
  }

  async getRecord(provider: AiProviderName): Promise<AiProviderConfig> {
    const config = await this.configs.findOne({ where: { provider } });
    if (!config) throw new BadRequestException(`Proveedor de IA no válido: ${provider}.`);
    return config;
  }

  private publicConfig(config: AiProviderConfig) {
    const { api_key_encrypted, ...publicConfig } = config;
    return {
      ...publicConfig,
      has_api_key: Boolean(api_key_encrypted) || this.hasLegacyCredential(config.provider),
    };
  }

  private getApiKey(config: AiProviderConfig): string | null {
    if (config.api_key_encrypted) return this.cipher.decrypt(config.api_key_encrypted);
    return this.legacyCredential(config.provider);
  }

  private hasLegacyCredential(provider: AiProviderName): boolean {
    return Boolean(this.legacyCredential(provider));
  }

  private legacyCredential(provider: AiProviderName): string | null {
    const variables: Record<AiProviderName, string | undefined> = {
      groq: process.env.GROQ_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
    };
    return variables[provider] ?? null;
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS, type AiProviderName } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { AiConfigurationGuard } from './ai-access.guard';

const PROVIDERS: AiProviderName[] = ['groq', 'gemini', 'deepseek', 'openai'];

@Controller('config/ia')
@UseGuards(AiConfigurationGuard)
export class AiConfigurationController {
  constructor(@Inject('MS_IA') private readonly client: ClientProxy) {}

  @Get('providers')
  listProviders() {
    return sendRpc(this.client.send(TCP_PATTERNS.IA.LIST_PROVIDER_CONFIGS, {}));
  }

  @Patch('providers/:provider')
  updateProvider(
    @Param('provider') provider: string,
    @Body()
    changes: {
      enabled?: boolean;
      priority?: number;
      base_url?: string;
      text_model?: string | null;
      vision_model?: string | null;
      api_key?: string;
      clear_api_key?: boolean;
    },
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.IA.UPDATE_PROVIDER_CONFIG, {
        provider: this.parseProvider(provider),
        changes,
      }),
    );
  }

  @Post('providers/:provider/test')
  testProvider(@Param('provider') provider: string) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.IA.TEST_PROVIDER_CONFIG, {
        provider: this.parseProvider(provider),
      }),
    );
  }

  private parseProvider(provider: string): AiProviderName {
    if (!PROVIDERS.includes(provider as AiProviderName)) {
      throw new BadRequestException('Proveedor de IA no válido.');
    }
    return provider as AiProviderName;
  }
}

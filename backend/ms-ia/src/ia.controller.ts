import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { AsistenteService, type AsistenteChatDto } from './asistente/asistente.service';
import { TriajeService, type InferirTriajeDto } from './triaje/triaje.service';
import {
  SugerenciaHechosService,
  type SugerenciaHechosDto,
} from './triaje/sugerencia-hechos.service';
import { RecomendacionCuadrillaService } from './cuadrillas/recomendacion.service';
import {
  AiConfigurationService,
  type UpdateAiProviderConfigDto,
} from './ai/ai-configuration.service';
import { AiProviderRegistry } from './ai/ai-provider.registry';
import type { AiProviderName } from '@ojo-camba/common';

@Controller()
export class IaController {
  constructor(
    private readonly asistente: AsistenteService,
    private readonly triaje: TriajeService,
    private readonly sugerenciaHechos: SugerenciaHechosService,
    private readonly recomendacionCuadrilla: RecomendacionCuadrillaService,
    private readonly configuration: AiConfigurationService,
    private readonly providers: AiProviderRegistry,
  ) {}

  @MessagePattern(TCP_PATTERNS.IA.PING)
  ping() {
    return { status: 'ok', service: 'ms-ia' };
  }

  @MessagePattern(TCP_PATTERNS.IA.CHAT)
  chat(@Payload() dto: AsistenteChatDto) {
    return this.asistente.chat(dto);
  }

  @MessagePattern(TCP_PATTERNS.IA.INFERIR_TRIAJE)
  inferirTriaje(@Payload() dto: InferirTriajeDto) {
    return this.triaje.inferir(dto);
  }

  @MessagePattern(TCP_PATTERNS.IA.SUGERIR_HECHOS)
  sugerirHechos(@Payload() dto: SugerenciaHechosDto) {
    return this.sugerenciaHechos.sugerir(dto);
  }

  @MessagePattern(TCP_PATTERNS.IA.RECOMENDAR_CUADRILLA)
  recomendarCuadrilla(@Payload() dto: { grupo_id: number }) {
    return this.recomendacionCuadrilla.recomendar(Number(dto?.grupo_id));
  }

  @MessagePattern(TCP_PATTERNS.IA.LIST_PROVIDER_CONFIGS)
  listProviderConfigs() {
    return this.configuration.list();
  }

  @MessagePattern(TCP_PATTERNS.IA.UPDATE_PROVIDER_CONFIG)
  updateProviderConfig(
    @Payload() dto: { provider: AiProviderName; changes: UpdateAiProviderConfigDto },
  ) {
    return this.configuration.update(dto.provider, dto.changes);
  }

  @MessagePattern(TCP_PATTERNS.IA.TEST_PROVIDER_CONFIG)
  testProviderConfig(@Payload() dto: { provider: string }) {
    return this.providers.test(dto.provider);
  }
}

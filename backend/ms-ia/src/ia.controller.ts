import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { AsistenteService, type AsistenteChatDto } from './asistente/asistente.service';
import { TriajeService, type InferirTriajeDto } from './triaje/triaje.service';
import {
  SugerenciaHechosService,
  type SugerenciaHechosDto,
} from './triaje/sugerencia-hechos.service';

@Controller()
export class IaController {
  constructor(
    private readonly asistente: AsistenteService,
    private readonly triaje: TriajeService,
    private readonly sugerenciaHechos: SugerenciaHechosService,
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
}

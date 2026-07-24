import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';

export interface InferirTriajeDto {
  categoria_id: number;
  creado_en: string;
  distancias_cercanas_m?: number[];
  ubicacion_sensible?: string;
  palabra_clave_riesgo?: boolean;
}

@Controller('ia')
export class IaController {
  constructor(@Inject('MS_IA') private readonly client: ClientProxy) {}

  @Post('triaje')
  inferirTriaje(@Body() dto: InferirTriajeDto) {
    return sendRpc(this.client.send(TCP_PATTERNS.IA.INFERIR_TRIAJE, dto));
  }
}

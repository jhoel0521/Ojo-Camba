import { Controller, Post, Body, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { BackofficeGuard } from './ai-access.guard';

export interface TurnoHistorial {
  role: 'user' | 'assistant';
  content: string;
}

export interface AsistenteChatDto {
  message: string;
  history?: TurnoHistorial[];
}

export interface AsistenteChatRespuesta {
  reply: string;
  redirect?: string;
  history: TurnoHistorial[];
}

@Controller('asistente')
@UseGuards(BackofficeGuard)
export class AsistenteController {
  constructor(@Inject('MS_IA') private readonly client: ClientProxy) {}

  @Post('chat')
  chat(@Body() dto: AsistenteChatDto): Promise<AsistenteChatRespuesta> {
    return sendRpc(this.client.send(TCP_PATTERNS.IA.CHAT, dto));
  }
}

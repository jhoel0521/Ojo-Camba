import { Controller, Post, Body } from '@nestjs/common';
import {
  AsistenteService,
  type AsistenteChatDto,
  type AsistenteChatRespuesta,
} from './asistente.service';

@Controller('asistente')
export class AsistenteController {
  constructor(private readonly asistente: AsistenteService) {}

  @Post('chat')
  chat(@Body() dto: AsistenteChatDto): Promise<AsistenteChatRespuesta> {
    return this.asistente.chat(dto);
  }
}

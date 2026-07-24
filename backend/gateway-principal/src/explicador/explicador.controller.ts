import { Controller, Post, Body } from '@nestjs/common';
import {
  ExplicadorService,
  type ExplicarDto,
  type ExplicacionRespuesta,
} from './explicador.service';

@Controller('explicador')
export class ExplicadorController {
  constructor(private readonly explicador: ExplicadorService) {}

  @Post('explicar')
  explicar(@Body() dto: ExplicarDto): Promise<ExplicacionRespuesta> {
    return this.explicador.explicar(dto);
  }
}

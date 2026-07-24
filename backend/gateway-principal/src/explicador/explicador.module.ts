import { Module } from '@nestjs/common';
import { ExplicadorController } from './explicador.controller';
import { ExplicadorService } from './explicador.service';

@Module({
  controllers: [ExplicadorController],
  providers: [ExplicadorService],
})
export class ExplicadorModule {}

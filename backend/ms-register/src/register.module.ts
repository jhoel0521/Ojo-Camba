import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';
import { Reporte } from './entities/reporte.entity';
import { Dispositivo } from './entities/dispositivo.entity';
import { Categoria } from './entities/categoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte, Dispositivo, Categoria])],
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';
import { Reporte, Dispositivo, Categoria } from '@ojo-camba/common';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte, Dispositivo, Categoria])],
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}

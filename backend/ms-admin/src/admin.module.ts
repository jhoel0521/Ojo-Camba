import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reporte, Dispositivo, GrupoReporte, ActualizacionCaso } from '@ojo-camba/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte, Dispositivo, GrupoReporte, ActualizacionCaso])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

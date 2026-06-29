import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Reporte, Dispositivo, GrupoReporte, ActualizacionCaso } from '@ojo-camba/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reporte, Dispositivo, GrupoReporte, ActualizacionCaso]),
    ClientsModule.register([
      {
        name: 'MS_GAMIFY',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_GAMIFY_HOST ?? 'localhost',
          port: parseInt(process.env.MS_GAMIFY_PORT ?? '3004', 10),
        },
      },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

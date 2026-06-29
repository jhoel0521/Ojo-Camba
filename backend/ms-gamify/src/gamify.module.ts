import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Nivel, HistorialPuntos } from '@ojo-camba/common';
import { GamifyController } from './gamify.controller';
import { GamifyService } from './gamify.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nivel, HistorialPuntos]),
    ClientsModule.register([
      {
        name: 'MS_AUTH',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_AUTH_HOST ?? 'localhost',
          port: parseInt(process.env.MS_AUTH_PORT ?? '3001', 10),
        },
      },
    ]),
  ],
  controllers: [GamifyController],
  providers: [GamifyService],
})
export class GamifyModule {}

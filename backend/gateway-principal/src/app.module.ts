import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { ReportesController } from './reportes.controller';
import { AdminController } from './admin.controller';
import { GamifyController } from './gamify.controller';
import { EventsModule } from './events/events.module';
import { AsistenteModule } from './asistente/asistente.module';

@Module({
  imports: [
    // Carga el .env del gateway (incluida GROQ_API_KEY) en process.env.
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
    AsistenteModule,
    ClientsModule.register([
      {
        name: 'MS_AUTH',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_AUTH_HOST ?? 'localhost',
          port: parseInt(process.env.MS_AUTH_PORT ?? '3001', 10),
        },
      },
      {
        name: 'MS_REGISTER',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_REGISTER_HOST ?? 'localhost',
          port: parseInt(process.env.MS_REGISTER_PORT ?? '3002', 10),
        },
      },
      {
        name: 'MS_ADMIN',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_ADMIN_HOST ?? 'localhost',
          port: parseInt(process.env.MS_ADMIN_PORT ?? '3003', 10),
        },
      },
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
  controllers: [
    HealthController,
    AuthController,
    ReportesController,
    AdminController,
    GamifyController,
  ],
})
export class AppModule {}

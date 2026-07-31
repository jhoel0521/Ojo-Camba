import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { ReportesController } from './reportes.controller';
import { AdminController } from './admin.controller';
import { GamifyController } from './gamify.controller';
import { AsistenteController } from './asistente.controller';
import { IaController } from './ia.controller';
import { AiConfigurationController } from './ai-configuration.controller';
import { OperacionController } from './operacion.controller';
import { GestionAccesosController } from './gestion-accesos.controller';
import { PrediccionController } from './prediccion.controller';
import { EventsModule } from './events/events.module';
import { AiConfigurationGuard, BackofficeGuard } from './ai-access.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
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
      {
        name: 'MS_IA',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_IA_HOST ?? 'localhost',
          port: parseInt(process.env.MS_IA_PORT ?? '3006', 10),
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
    AsistenteController,
    IaController,
    AiConfigurationController,
    OperacionController,
    GestionAccesosController,
    PrediccionController,
  ],
  providers: [BackofficeGuard, AiConfigurationGuard, RolesGuard],
})
export class AppModule {}

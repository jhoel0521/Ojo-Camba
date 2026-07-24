import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { IaController } from './ia.controller';
import { AsistenteService } from './asistente/asistente.service';
import { AsistenteToolkit } from './asistente/asistente.toolkit';
import { TriajeService } from './triaje/triaje.service';
import { GroqProvider } from './ai/groq.provider';
import { AiProviderRegistry } from './ai/ai-provider.registry';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MS_ADMIN',
        transport: Transport.TCP,
        options: {
          host: process.env.MS_ADMIN_HOST ?? 'localhost',
          port: parseInt(process.env.MS_ADMIN_PORT ?? '3003', 10),
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
    ]),
  ],
  controllers: [IaController],
  providers: [AsistenteService, AsistenteToolkit, TriajeService, GroqProvider, AiProviderRegistry],
})
export class IaModule {}

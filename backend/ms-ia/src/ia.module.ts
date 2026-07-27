import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderConfig } from '@ojo-camba/common';
import { IaController } from './ia.controller';
import { AsistenteService } from './asistente/asistente.service';
import { AsistenteToolkit } from './asistente/asistente.toolkit';
import { TriajeService } from './triaje/triaje.service';
import { SugerenciaHechosService } from './triaje/sugerencia-hechos.service';
import { RecomendacionCuadrillaService } from './cuadrillas/recomendacion.service';
import { GroqProvider } from './ai/groq.provider';
import { AiProviderRegistry } from './ai/ai-provider.registry';
import { GeminiProvider } from './ai/gemini.provider';
import { DeepSeekProvider } from './ai/deepseek.provider';
import { OpenAiProvider } from './ai/openai.provider';
import { AiConfigurationService } from './ai/ai-configuration.service';
import { AiCredentialCipher } from './ai/ai-credential-cipher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiProviderConfig]),
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
  providers: [
    AsistenteService,
    AsistenteToolkit,
    TriajeService,
    SugerenciaHechosService,
    RecomendacionCuadrillaService,
    GroqProvider,
    GeminiProvider,
    DeepSeekProvider,
    OpenAiProvider,
    AiConfigurationService,
    AiCredentialCipher,
    AiProviderRegistry,
  ],
})
export class IaModule {}

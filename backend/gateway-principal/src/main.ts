import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 10485760 }),
  );

  app.enableCors();
  // socket.io corre en su propio puerto (EventsGateway usa WS_PORT=3010),
  // por eso esto no interfiere con el HTTP de Fastify (:3000).
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Gateway Principal running on http://0.0.0.0:${port}`);
}

bootstrap();

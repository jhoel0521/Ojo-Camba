import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './rpc-exception.filter';

async function bootstrap() {
  const port = parseInt(process.env.TCP_PORT ?? '3003', 10);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  app.useGlobalFilters(new RpcExceptionFilter());

  await app.listen();
  console.log(`MS Admin listening on TCP :${port}`);
}

bootstrap();

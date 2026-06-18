import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
  controllers: [StatusController],
  providers: [StatusService],
})
export class AppModule {}

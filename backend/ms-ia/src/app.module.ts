import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IaModule } from './ia.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), IaModule],
})
export class AppModule {}

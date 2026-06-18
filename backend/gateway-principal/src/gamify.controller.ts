import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { TCP_PATTERNS } from '@ojo-camba/common';

@Controller('gamify')
export class GamifyController {
  constructor(@Inject('MS_GAMIFY') private readonly client: ClientProxy) {}

  @Post('award')
  award(@Body() dto: { user_id: number; puntos: number }) {
    return firstValueFrom(this.client.send(TCP_PATTERNS.GAMIFY.AWARD_POINTS, dto));
  }

  @Get('stats/:id')
  stats(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send(TCP_PATTERNS.GAMIFY.GET_USER_STATS, { user_id: parseInt(id, 10) }),
    );
  }

  @Get('levels')
  levels() {
    return firstValueFrom(this.client.send(TCP_PATTERNS.GAMIFY.GET_LEVELS, {}));
  }
}

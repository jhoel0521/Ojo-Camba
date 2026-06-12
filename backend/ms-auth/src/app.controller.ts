import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';

@Controller()
export class AppController {
  @MessagePattern(TCP_PATTERNS.AUTH.PING)
  ping() {
    return { status: 'ok', service: 'ms-auth' };
  }
}

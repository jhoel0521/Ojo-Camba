import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { TCP_PATTERNS } from '@ojo-camba/common';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'down';
  latencyMs?: number;
}

@Controller()
export class StatusController {
  constructor(
    @Inject('MS_AUTH') private readonly authClient: ClientProxy,
    @Inject('MS_REGISTER') private readonly registerClient: ClientProxy,
    @Inject('MS_ADMIN') private readonly adminClient: ClientProxy,
    @Inject('MS_GAMIFY') private readonly gamifyClient: ClientProxy,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gateway-status',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  async getStatus() {
    const services = [
      { name: 'ms-auth', client: this.authClient, pattern: TCP_PATTERNS.AUTH.PING },
      { name: 'ms-register', client: this.registerClient, pattern: TCP_PATTERNS.REGISTER.PING },
      { name: 'ms-admin', client: this.adminClient, pattern: TCP_PATTERNS.ADMIN.PING },
      { name: 'ms-gamify', client: this.gamifyClient, pattern: TCP_PATTERNS.GAMIFY.PING },
    ];

    const results = await Promise.allSettled(
      services.map(async (s) => {
        const start = Date.now();
        await firstValueFrom(s.client.send(s.pattern, {}).pipe(timeout(3000)));
        return Date.now() - start;
      }),
    );

    const statuses: ServiceStatus[] = services.map((s, i) => {
      const result = results[i];
      return {
        name: s.name,
        status: result.status === 'fulfilled' ? 'ok' : 'down',
        latencyMs: result.status === 'fulfilled' ? result.value : undefined,
      };
    });

    const allOk = statuses.every((s) => s.status === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      services: statuses,
      timestamp: new Date().toISOString(),
    };
  }
}

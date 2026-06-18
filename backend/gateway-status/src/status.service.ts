import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { firstValueFrom, timeout } from 'rxjs';
import { TCP_PATTERNS } from '@ojo-camba/common';

export interface ServiceStatus {
  name: string;
  status: 'ok' | 'down';
  latencyMs?: number;
}

export interface StatusResult {
  status: 'ok' | 'degraded';
  services: ServiceStatus[];
  timestamp: string;
}

@Injectable()
export class StatusService {
  private cached: StatusResult;

  constructor(
    @Inject('MS_AUTH') private readonly authClient: ClientProxy,
    @Inject('MS_REGISTER') private readonly registerClient: ClientProxy,
    @Inject('MS_ADMIN') private readonly adminClient: ClientProxy,
    @Inject('MS_GAMIFY') private readonly gamifyClient: ClientProxy,
  ) {
    this.pingAll();
  }

  @Interval(60000)
  private autoPing() {
    this.pingAll();
  }

  getStatus(): StatusResult {
    return this.cached;
  }

  private async pingAll() {
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

    this.cached = {
      status: allOk ? 'ok' : 'degraded',
      services: statuses,
      timestamp: new Date().toISOString(),
    };
  }
}

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';
import { TCP_PATTERNS, PingLog } from '@ojo-camba/common';

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

export interface DayUptime {
  fecha: string;
  uptimePct: number;
  totalChecks: number;
}

export interface ServiceHistory {
  servicio: string;
  dias: DayUptime[];
}

const DIAS_HISTORIAL_DEFAULT = 30;
const DIAS_HISTORIAL_MAX = 90;

@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);
  private cached: StatusResult;

  constructor(
    @Inject('MS_AUTH') private readonly authClient: ClientProxy,
    @Inject('MS_REGISTER') private readonly registerClient: ClientProxy,
    @Inject('MS_ADMIN') private readonly adminClient: ClientProxy,
    @Inject('MS_GAMIFY') private readonly gamifyClient: ClientProxy,
    @InjectRepository(PingLog) private readonly pingLogRepo: Repository<PingLog>,
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

    try {
      await this.pingLogRepo.insert(
        statuses.map((s) => ({
          servicio: s.name,
          estado: s.status,
          latencia_ms: s.latencyMs ?? null,
        })),
      );
    } catch (err) {
      this.logger.warn(`No se pudo persistir el historial de ping: ${(err as Error).message}`);
    }
  }

  async getHistory(days = DIAS_HISTORIAL_DEFAULT): Promise<ServiceHistory[]> {
    const clamped = Math.min(Math.max(days, 1), DIAS_HISTORIAL_MAX);
    const since = new Date();
    since.setDate(since.getDate() - clamped);
    since.setHours(0, 0, 0, 0);

    const rows = await this.pingLogRepo
      .createQueryBuilder('p')
      .select('p.servicio', 'servicio')
      .addSelect("date_trunc('day', p.creado_en)", 'dia')
      .addSelect("COUNT(*) FILTER (WHERE p.estado = 'ok')", 'ok_count')
      .addSelect('COUNT(*)', 'total_count')
      .where('p.creado_en >= :since', { since })
      .groupBy('p.servicio')
      .addGroupBy('dia')
      .orderBy('p.servicio')
      .addOrderBy('dia')
      .getRawMany<{ servicio: string; dia: Date; ok_count: string; total_count: string }>();

    const bySvc = new Map<string, DayUptime[]>();
    for (const row of rows) {
      const list = bySvc.get(row.servicio) ?? [];
      list.push({
        fecha: new Date(row.dia).toISOString().slice(0, 10),
        uptimePct: Math.round((Number(row.ok_count) / Number(row.total_count)) * 1000) / 10,
        totalChecks: Number(row.total_count),
      });
      bySvc.set(row.servicio, list);
    }

    return Array.from(bySvc.entries()).map(([servicio, dias]) => ({ servicio, dias }));
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/** TTL de un claim: si no llega heartbeat en 60s, se libera. */
export const CLAIM_TTL_MS = 60_000;
const SWEEP_INTERVAL_MS = 10_000;
/**
 * socket.io corre en un puerto propio (3010) en lugar de adjuntarse al
 * servidor HTTP de Fastify (:3000), porque el IoAdapter por defecto choca
 * con Fastify y secuestra el ruteo HTTP. Configurable con WS_PORT.
 */
export const WS_PORT = parseInt(process.env.WS_PORT ?? '3010', 10);

interface Claim {
  reportId: number;
  moderadorId: number;
  nombre: string;
  socketId: string;
  /** epoch ms del último heartbeat/claim. */
  lastSeen: number;
}

export interface ClaimInfo {
  reportId: number;
  moderadorId: number;
  nombre: string;
}

/**
 * EventsGateway — tiempo real para el backoffice (ISSUE-23 / CU moderación).
 *
 * - Difunde reportes nuevos y resueltos sin recargar.
 * - Sistema de "claim": un moderador toma un reporte y los demás lo ven
 *   bloqueado. El claim se libera al soltar, al resolver, por desconexión
 *   o por expiración de TTL (60s sin heartbeat).
 */
@WebSocketGateway(WS_PORT, { cors: { origin: '*' } })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private readonly claims = new Map<number, Claim>();
  private sweepTimer?: ReturnType<typeof setInterval>;

  afterInit() {
    this.sweepTimer = setInterval(() => this.sweepExpired(), SWEEP_INTERVAL_MS);
    this.logger.log('EventsGateway inicializado');
  }

  handleConnection(client: Socket) {
    // Estado inicial: enviar los claims activos al cliente que se conecta.
    client.emit('claims:snapshot', this.activeClaims());
  }

  handleDisconnect(client: Socket) {
    // Auto-release: liberar todos los claims que tenía este socket.
    for (const [reportId, claim] of this.claims) {
      if (claim.socketId === client.id) {
        this.claims.delete(reportId);
        this.server.emit('report:released', { reportId });
      }
    }
  }

  @SubscribeMessage('report:claim')
  handleClaim(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportId: number; moderadorId: number; nombre: string },
  ) {
    const existing = this.claims.get(data.reportId);
    if (existing && existing.moderadorId !== data.moderadorId && !this.isExpired(existing)) {
      // Ya está tomado por otro moderador.
      client.emit('report:claim_denied', { reportId: data.reportId, nombre: existing.nombre });
      return;
    }
    this.claims.set(data.reportId, {
      reportId: data.reportId,
      moderadorId: data.moderadorId,
      nombre: data.nombre,
      socketId: client.id,
      lastSeen: Date.now(),
    });
    this.server.emit('report:claimed', {
      reportId: data.reportId,
      moderadorId: data.moderadorId,
      nombre: data.nombre,
    });
  }

  @SubscribeMessage('report:release')
  handleRelease(@ConnectedSocket() client: Socket, @MessageBody() data: { reportId: number }) {
    const existing = this.claims.get(data.reportId);
    if (existing && existing.socketId === client.id) {
      this.claims.delete(data.reportId);
      this.server.emit('report:released', { reportId: data.reportId });
    }
  }

  @SubscribeMessage('report:heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: { reportId: number }) {
    const existing = this.claims.get(data.reportId);
    if (existing && existing.socketId === client.id) {
      existing.lastSeen = Date.now();
    }
  }

  // ── API pública (la usan los controllers) ──────────────────────────────

  /** Notifica un reporte recién creado a todas las bandejas. */
  emitNewReport(report: unknown) {
    this.server?.emit('report:new', report);
  }

  /** Reporte aceptado/rechazado: liberar su claim y sacarlo de las bandejas. */
  emitReportResolved(reportId: number) {
    if (this.claims.delete(reportId)) {
      this.server?.emit('report:released', { reportId });
    }
    this.server?.emit('report:resolved', { reportId });
  }

  /** Actualiza los contadores del dashboard en tiempo real. */
  emitStatsUpdate(stats: unknown) {
    this.server?.emit('stats:update', stats);
  }

  // ── Internos ───────────────────────────────────────────────────────────

  private isExpired(claim: Claim): boolean {
    return Date.now() - claim.lastSeen > CLAIM_TTL_MS;
  }

  private sweepExpired() {
    for (const [reportId, claim] of this.claims) {
      if (this.isExpired(claim)) {
        this.claims.delete(reportId);
        this.server.emit('report:released', { reportId });
      }
    }
  }

  private activeClaims(): ClaimInfo[] {
    return Array.from(this.claims.values())
      .filter((c) => !this.isExpired(c))
      .map(({ reportId, moderadorId, nombre }) => ({ reportId, moderadorId, nombre }));
  }
}

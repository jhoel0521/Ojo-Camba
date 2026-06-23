import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { Nivel } from './entities/nivel.entity';
import { HistorialPuntos } from './entities/historial-puntos.entity';
import { AwardPointsDto } from './dto';

@Injectable()
export class GamifyService implements OnModuleInit {
  private readonly logger = new Logger(GamifyService.name);

  // Puntos otorgados por defecto cuando un reporte es aceptado (HU-06).
  // Configurable por env; el backlog no fija un valor, default 10 (pendiente de confirmar).
  private readonly PUNTOS_POR_REPORTE = parseInt(
    process.env.PUNTOS_POR_REPORTE_ACEPTADO ?? '10',
    10,
  );

  constructor(
    @InjectRepository(Nivel)
    private readonly nivelRepo: Repository<Nivel>,
    @InjectRepository(HistorialPuntos)
    private readonly historialRepo: Repository<HistorialPuntos>,
    @Inject('MS_AUTH')
    private readonly authClient: ClientProxy,
  ) {}

  // ── HU-06: Otorgar puntos ─────────────────────────────────

  async awardPoints(dto: AwardPointsDto) {
    const puntos = dto.puntos ?? this.PUNTOS_POR_REPORTE;

    // Idempotencia: si el reporte ya otorgo puntos, se conservan sin volver a sumar.
    if (dto.report_id != null) {
      const previo = await this.historialRepo.findOne({
        where: { report_id: dto.report_id },
      });
      if (previo) {
        this.logger.log(`Reporte ${dto.report_id} ya otorgo puntos; se conservan sin cambios`);
        const stats = await this.getUserStats(dto.user_id);
        return {
          user_id: dto.user_id,
          puntos: stats.puntos,
          nivel: stats.nivel,
          subio_de_nivel: false,
          ya_otorgado: true,
        };
      }
    }

    await this.historialRepo.save(
      this.historialRepo.create({
        usuario_id: dto.user_id,
        report_id: dto.report_id ?? null,
        puntos,
        motivo: dto.motivo ?? 'Reporte aceptado',
      }),
    );

    const { puntos: total, nivel_id } = await firstValueFrom(
      this.authClient.send<{ user_id: number; puntos: number; nivel_id: number | null }>(
        TCP_PATTERNS.AUTH.ADD_POINTS,
        { user_id: dto.user_id, puntos },
      ),
    );

    // Recalcula el nivel mas alto alcanzable (soporta saltar varios niveles de golpe).
    const nuevoNivel = await this.resolveNivel(total);
    const subioDeNivel = !!(nuevoNivel && nuevoNivel.id !== nivel_id);
    if (subioDeNivel) {
      await firstValueFrom(
        this.authClient.send(TCP_PATTERNS.AUTH.UPDATE_LEVEL, {
          user_id: dto.user_id,
          nivel_id: nuevoNivel!.id,
        }),
      );
      this.logger.log(`Usuario ${dto.user_id} subio al nivel ${nuevoNivel!.nombre}`);
    }

    return {
      user_id: dto.user_id,
      puntos: total,
      nivel: nuevoNivel,
      subio_de_nivel: subioDeNivel,
      ya_otorgado: false,
    };
  }

  // ── Estadisticas del usuario ──────────────────────────────

  async getUserStats(userId: number) {
    // Si el usuario no existe, ms-auth responde un objeto de error (RpcExceptionFilter);
    // `puntos` queda undefined -> estado inicial (0 puntos, nivel base) sin reventar.
    const profile = await firstValueFrom(
      this.authClient.send<{ puntos?: number }>(TCP_PATTERNS.AUTH.GET_PROFILE, {
        user_id: userId,
      }),
    );

    const puntos = profile?.puntos ?? 0;
    const nivel = await this.resolveNivel(puntos);
    const siguienteNivel = await this.nivelRepo
      .createQueryBuilder('n')
      .where('n.puntos_requeridos > :puntos', { puntos })
      .orderBy('n.puntos_requeridos', 'ASC')
      .getOne();

    const base = nivel ? nivel.puntos_requeridos : 0;
    let puntosSiguiente: number | null;
    let porcentaje: number;
    if (siguienteNivel) {
      puntosSiguiente = siguienteNivel.puntos_requeridos;
      const rango = siguienteNivel.puntos_requeridos - base;
      porcentaje = rango > 0 ? Math.min(100, Math.round(((puntos - base) / rango) * 100)) : 100;
    } else {
      // Nivel maximo: no hay siguiente, progreso al 100%.
      puntosSiguiente = null;
      porcentaje = 100;
    }

    return {
      user_id: userId,
      puntos,
      nivel,
      progreso: {
        puntos_actuales: puntos,
        puntos_siguiente_nivel: puntosSiguiente,
        porcentaje,
      },
    };
  }

  // ── Catalogo de niveles ───────────────────────────────────

  getLevels() {
    return this.nivelRepo.find({ order: { puntos_requeridos: 'ASC' } });
  }

  // ── Helpers ───────────────────────────────────────────────

  private resolveNivel(puntos: number) {
    return this.nivelRepo
      .createQueryBuilder('n')
      .where('n.puntos_requeridos <= :puntos', { puntos })
      .orderBy('n.puntos_requeridos', 'DESC')
      .getOne();
  }

  // Siembra de niveles base (mismo patron que ms-auth siembra roles en onModuleInit).
  async onModuleInit() {
    const niveles = [
      { nombre: 'Bronce', puntos_requeridos: 0, url_sticker: null },
      { nombre: 'Plata', puntos_requeridos: 50, url_sticker: null },
      { nombre: 'Oro', puntos_requeridos: 200, url_sticker: null },
    ];
    for (const nivel of niveles) {
      const exists = await this.nivelRepo.findOne({ where: { nombre: nivel.nombre } });
      if (!exists) {
        await this.nivelRepo.save(this.nivelRepo.create(nivel));
      }
    }
  }
}

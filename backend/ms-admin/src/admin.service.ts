import { Injectable, BadRequestException, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  Reporte,
  Dispositivo,
  GrupoReporte,
  ActualizacionCaso,
  Categoria,
  EstadoReporte,
  TCP_PATTERNS,
} from '@ojo-camba/common';
import { CreateGroupDto, UpdateCaseDto, AcceptReportDto, BanDeviceDto } from './dto';

interface ImagenResult {
  buffer: Buffer;
  contentType: string;
}

const isExternalUrl = (url: string | null): boolean => url?.startsWith('http') === true;

function actualizacionImagePath(a: { id: number; url_imagen: string | null }): string | null {
  if (!a.url_imagen) return null;
  if (isExternalUrl(a.url_imagen)) return a.url_imagen;
  return `/admin/updates/${a.id}/imagen`;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
    @InjectRepository(Dispositivo)
    private readonly dispositivoRepo: Repository<Dispositivo>,
    @InjectRepository(GrupoReporte)
    private readonly grupoRepo: Repository<GrupoReporte>,
    @InjectRepository(ActualizacionCaso)
    private readonly actualizacionRepo: Repository<ActualizacionCaso>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
    @Inject('MS_GAMIFY')
    private readonly gamifyClient: ClientProxy,
  ) {
    this.bucket = process.env.S3_BUCKET ?? 'reportes';
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'ojocamba',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'ojocamba_secret',
      },
      forcePathStyle: true,
    });
  }

  // ── CU-06: Bandeja de pendientes ──────────────────────────

  async listPending(page = 1, limit = 20) {
    const [data, total] = await this.reporteRepo.findAndCount({
      where: { estado: EstadoReporte.Reportado },
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });
    const mapped = data.map((r) => ({
      ...r,
      lat: Number(r.lat),
      lng: Number(r.lng),
      url_imagen: r.url_imagen
        ? r.url_imagen.startsWith('http')
          ? r.url_imagen
          : `/reportes/${r.id}/imagen`
        : null,
    }));
    return { data: mapped, total, page, limit };
  }

  // ── CU-07: Aceptar / Rechazar ─────────────────────────────

  async acceptReport(dto: AcceptReportDto) {
    // Transaccion con bloqueo pesimista sobre el reporte: evita que dos accept_report
    // concurrentes sobre el mismo reporte pasen ambos la verificacion de estado
    // (atomicidad/aislamiento — ISSUE-18).
    const result = await this.reporteRepo.manager.transaction(async (manager) => {
      const reporte = await manager.findOne(Reporte, {
        where: { id: dto.report_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reporte) throw new NotFoundException('Reporte no encontrado');
      if (reporte.estado !== EstadoReporte.Reportado) {
        throw new BadRequestException('Solo se pueden aceptar reportes en estado Reportado');
      }

      reporte.estado = EstadoReporte.Aceptado;

      if (dto.grupo_id) {
        const grupo = await manager.findOne(GrupoReporte, { where: { id: dto.grupo_id } });
        if (!grupo) throw new NotFoundException('Caso de Obra no encontrado');
        reporte.grupo_id = grupo.id;
        await manager.save(reporte);
        return {
          reporte,
          grupo_id: grupo.id,
          codigo_obra: grupo.codigo_obra,
        };
      }

      const year = new Date().getFullYear();
      const count = (await manager.count(GrupoReporte)) + 1;
      const codigoObra = `O-${String(year).slice(-2)}-${String(count).padStart(7, '0')}`;

      const grupo = await manager.save(
        manager.create(GrupoReporte, {
          codigo_obra: codigoObra,
          estado_actual: EstadoReporte.Aceptado,
          creado_por_usuario_id: dto.moderador_id,
          categoria_id: dto.categoria_id ?? reporte.categoria_id,
        }),
      );
      reporte.grupo_id = grupo.id;
      await manager.save(reporte);

      return { reporte, grupo_id: grupo.id, codigo_obra: codigoObra };
    });

    // HU-06: al aceptar, se otorgan puntos al dueño del reporte (si es un usuario registrado).
    // Fire-and-forget: la aceptación no falla si ms-gamify esta caido; el error solo se loguea.
    if (result.reporte.usuario_id != null) {
      this.gamifyClient
        .emit(TCP_PATTERNS.GAMIFY.AWARD_POINTS, {
          user_id: result.reporte.usuario_id,
          report_id: result.reporte.id,
        })
        .subscribe({
          error: (err) =>
            this.logger.error(
              `No se pudieron otorgar puntos (reporte ${result.reporte.id}, usuario ${result.reporte.usuario_id}): ${err?.message ?? err}`,
            ),
        });
    }

    return {
      id: result.reporte.id,
      estado: result.reporte.estado,
      grupo_id: result.grupo_id,
      codigo_obra: result.codigo_obra,
    };
  }

  async rejectReport(reportId: number) {
    const reporte = await this.reporteRepo.findOne({ where: { id: reportId } });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    if (reporte.estado !== EstadoReporte.Reportado) {
      throw new BadRequestException('Solo se pueden rechazar reportes en estado Reportado');
    }

    reporte.estado = EstadoReporte.Rechazado;
    await this.reporteRepo.save(reporte);

    return { id: reporte.id, estado: reporte.estado };
  }

  // ── CU-09: Banear dispositivo ─────────────────────────────

  async banDevice(dto: BanDeviceDto) {
    const dispositivo = await this.dispositivoRepo.findOne({
      where: { device_id: dto.device_id },
    });
    if (!dispositivo) throw new NotFoundException('Dispositivo no encontrado');

    dispositivo.is_banned = true;
    dispositivo.motivo_ban = dto.motivo ?? null;
    await this.dispositivoRepo.save(dispositivo);

    return { ok: true, device_id: dto.device_id, is_banned: true };
  }

  // ── CU-08 / CU-11: Crear Caso de Obra ─────────────────────

  async createGroup(dto: CreateGroupDto) {
    if (dto.report_ids.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 reportes');
    }

    const reportes = await this.reporteRepo.find({ where: { id: In(dto.report_ids) } });
    if (reportes.length !== dto.report_ids.length) {
      throw new BadRequestException('Uno o mas reportes no existen');
    }

    const noReportados = reportes.filter((r) => r.estado !== EstadoReporte.Reportado);
    if (noReportados.length > 0) {
      throw new BadRequestException('Solo se pueden agrupar reportes en estado Reportado');
    }

    const year = new Date().getFullYear();
    const count = (await this.grupoRepo.count()) + 1;
    const codigoObra = `O-${String(year).slice(-2)}-${String(count).padStart(7, '0')}`;

    const grupo = this.grupoRepo.create({
      codigo_obra: codigoObra,
      estado_actual: EstadoReporte.Aceptado,
      creado_por_usuario_id: dto.creado_por_usuario_id,
    });
    await this.grupoRepo.save(grupo);

    await this.reporteRepo.update(dto.report_ids, {
      grupo_id: grupo.id,
      estado: EstadoReporte.Aceptado,
    });

    this.logger.log(`Caso de Obra creado: ${codigoObra} con ${dto.report_ids.length} reportes`);

    return {
      id: grupo.id,
      codigo_obra: codigoObra,
      reportes_agrupados: dto.report_ids.length,
    };
  }

  // ── CU-12 / CU-13 / CU-14: Bitácora, GPS, Estado ──────────

  async updateCase(dto: UpdateCaseDto) {
    const grupo = await this.grupoRepo.findOne({ where: { id: dto.grupo_id } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado');

    // Validar el estado ANTES de persistir la bitacora: evita dejar una
    // actualizacion huerfana cuando estado_nuevo es invalido.
    if (dto.estado_nuevo) {
      const validos = Object.values(EstadoReporte);
      if (!validos.includes(dto.estado_nuevo as EstadoReporte)) {
        throw new BadRequestException(`Estado invalido. Validos: ${validos.join(', ')}`);
      }
    }

    // Si viene una foto nueva en base64 (bitacora del tecnico), subirla a S3
    // y persistir solo la key — igual que ms-register con las fotos de reportes.
    let urlImagen = dto.url_imagen ?? null;
    if (urlImagen) {
      const match = urlImagen.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `actualizaciones/${crypto.randomUUID()}.${ext}`;
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: filename,
            Body: buffer,
            ContentType: `image/${ext}`,
          }),
        );
        urlImagen = filename;
      }
    }

    const actualizacion = this.actualizacionRepo.create({
      grupo_id: dto.grupo_id,
      usuario_id: dto.usuario_id,
      comentario: dto.comentario,
      estado_nuevo: dto.estado_nuevo ?? null,
      recursos_solicitados: dto.recursos_solicitados ?? null,
      fecha_estimada_fin: dto.fecha_estimada_fin ?? null,
      lat_actualizada: dto.lat_actualizada ?? null,
      lng_actualizada: dto.lng_actualizada ?? null,
      url_imagen: urlImagen,
    });
    await this.actualizacionRepo.save(actualizacion);

    if (dto.estado_nuevo) {
      grupo.estado_actual = dto.estado_nuevo;
      if (dto.fecha_estimada_fin) {
        grupo.fecha_estimada_fin = dto.fecha_estimada_fin;
      }
      await this.grupoRepo.save(grupo);

      await this.reporteRepo.update({ grupo_id: dto.grupo_id }, { estado: dto.estado_nuevo });
    }

    return {
      id: actualizacion.id,
      grupo_id: dto.grupo_id,
      estado_nuevo: actualizacion.estado_nuevo,
      comentario: actualizacion.comentario,
      url_imagen: actualizacionImagePath(actualizacion),
      creado_en: actualizacion.creado_en,
    };
  }

  async getActualizacionImagen(actualizacionId: number): Promise<ImagenResult> {
    const actualizacion = await this.actualizacionRepo.findOne({
      where: { id: actualizacionId },
    });
    if (!actualizacion?.url_imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }
    if (isExternalUrl(actualizacion.url_imagen)) {
      throw new NotFoundException('Imagen no gestionada por el sistema');
    }

    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: actualizacion.url_imagen }),
    );

    const chunks: Buffer[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return { buffer: Buffer.concat(chunks), contentType: response.ContentType ?? 'image/jpeg' };
  }

  // ── CU-04: Bitácora pública ───────────────────────────────

  async getGroup(grupoId: number) {
    const grupo = await this.grupoRepo.findOne({ where: { id: grupoId } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado');

    const totalReportes = await this.reporteRepo.count({ where: { grupo_id: grupoId } });

    return { ...grupo, total_reportes: totalReportes };
  }

  async getGroupsHeatmap(resolution = 8, soloActivos = true) {
    const qb = this.grupoRepo
      .createQueryBuilder('g')
      .innerJoin(Reporte, 'r', 'r.grupo_id = g.id')
      .select(`r.h3_res_${resolution}`, 'h3_cell')
      .addSelect('g.categoria_id', 'categoria_id')
      .addSelect('COUNT(DISTINCT g.id)', 'count')
      .where('g.categoria_id IS NOT NULL')
      .groupBy(`r.h3_res_${resolution}`)
      .addGroupBy('g.categoria_id')
      .orderBy('count', 'DESC');

    if (soloActivos) {
      qb.andWhere('g.estado_actual NOT IN (:...estados)', {
        estados: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      });
    }
    return qb.getRawMany();
  }

  async listGroupsByCell(h3_cell: string, h3_resolution: number, soloActivos = true) {
    const col = `r.h3_res_${h3_resolution}`;
    const qb = this.grupoRepo
      .createQueryBuilder('g')
      .innerJoin(Reporte, 'r', `r.grupo_id = g.id AND ${col} = :cell`, { cell: h3_cell })
      .select('g.id', 'id')
      .addSelect('g.codigo_obra', 'codigo_obra')
      .addSelect('g.estado_actual', 'estado_actual')
      .addSelect('g.categoria_id', 'categoria_id')
      .addSelect('g.creado_en', 'creado_en')
      .addSelect('COUNT(r.id)', 'total_reportes')
      .addSelect('MIN(r.url_imagen)', 'preview_imagen')
      .groupBy('g.id')
      .orderBy('g.creado_en', 'DESC');

    if (soloActivos) {
      qb.andWhere('g.estado_actual NOT IN (:...estados)', {
        estados: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      });
    }
    return qb.getRawMany();
  }

  async listGroups(page = 1, limit = 20, estado?: string) {
    const qb = this.grupoRepo
      .createQueryBuilder('g')
      .leftJoin(Reporte, 'r', 'r.grupo_id = g.id')
      .addSelect('COUNT(r.id)', 'total_reportes')
      .groupBy('g.id')
      .orderBy('g.creado_en', 'DESC');

    if (estado) {
      qb.where('g.estado_actual = :estado', { estado });
    }

    const total = await (estado
      ? this.grupoRepo.count({ where: { estado_actual: estado } })
      : this.grupoRepo.count());

    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const data = rows.entities.map((g, i) => ({
      ...g,
      total_reportes: parseInt(rows.raw[i]?.total_reportes ?? '0', 10),
    }));

    return { data, total, page, limit };
  }

  async getCaseTimeline(grupoId: number) {
    const grupo = await this.grupoRepo.findOne({ where: { id: grupoId } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado');

    const data = await this.actualizacionRepo.find({
      where: { grupo_id: grupoId },
      order: { creado_en: 'ASC' },
    });

    return data.map((a) => ({ ...a, url_imagen: actualizacionImagePath(a) }));
  }

  async getDashboard() {
    const pendientes = await this.reporteRepo.count({ where: { estado: EstadoReporte.Reportado } });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const aceptadosHoy = await this.reporteRepo
      .createQueryBuilder('r')
      .where('r.estado = :estado', { estado: EstadoReporte.Aceptado })
      .andWhere('r.creado_en >= :hoy', { hoy: hoy.toISOString() })
      .getCount();

    const casosActivos = await this.grupoRepo
      .createQueryBuilder('g')
      .where('g.estado_actual NOT IN (:...estados)', {
        estados: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      })
      .getCount();

    const baneados = await this.dispositivoRepo.count({ where: { is_banned: true } });

    return {
      pendientes,
      aceptados_hoy: aceptadosHoy,
      casos_activos: casosActivos,
      dispositivos_baneados: baneados,
    };
  }

  async listGroupReports(grupoId: number) {
    const data = await this.reporteRepo.find({
      where: { grupo_id: grupoId },
      order: { creado_en: 'ASC' },
    });
    return data.map((r) => ({
      ...r,
      lat: Number(r.lat),
      lng: Number(r.lng),
      url_imagen: r.url_imagen?.startsWith('http') ? r.url_imagen : `/reportes/${r.id}/imagen`,
    }));
  }

  async listNearbyReports(lat: number, lng: number, radiusM = 100) {
    // Bounding box approximation: 1° ≈ 111,000m
    const delta = radiusM / 111000;
    const data = await this.reporteRepo
      .createQueryBuilder('r')
      .where('r.estado = :estado', { estado: EstadoReporte.Reportado })
      .andWhere('CAST(r.lat AS FLOAT) BETWEEN :minLat AND :maxLat', {
        minLat: lat - delta,
        maxLat: lat + delta,
      })
      .andWhere('CAST(r.lng AS FLOAT) BETWEEN :minLng AND :maxLng', {
        minLng: lng - delta,
        maxLng: lng + delta,
      })
      .orderBy('r.creado_en', 'DESC')
      .getMany();

    return data.map((r) => ({
      ...r,
      lat: Number(r.lat),
      lng: Number(r.lng),
      url_imagen: r.url_imagen?.startsWith('http') ? r.url_imagen : `/reportes/${r.id}/imagen`,
    }));
  }

  // ── HU-07: Casos de Obra cercanos (tecnico en campo) ───────
  // Igual criterio que listNearbyReports: distancia fisica por bounding box,
  // no igualdad estricta de celda H3 (un caso real puede tener reportes en
  // celdas vecinas distintas cerca del borde del hexagono).

  async listNearbyGroups(lat: number, lng: number, radiusM = 300) {
    const delta = radiusM / 111000;
    const data = await this.grupoRepo
      .createQueryBuilder('g')
      .innerJoin(Reporte, 'r', 'r.grupo_id = g.id')
      .select('g.id', 'id')
      .addSelect('g.codigo_obra', 'codigo_obra')
      .addSelect('g.estado_actual', 'estado_actual')
      .addSelect('g.categoria_id', 'categoria_id')
      .addSelect('g.fecha_estimada_fin', 'fecha_estimada_fin')
      .addSelect('g.creado_en', 'creado_en')
      .addSelect('COUNT(DISTINCT r.id)', 'total_reportes')
      .addSelect('MIN(r.url_imagen)', 'preview_imagen')
      .addSelect('AVG(CAST(r.lat AS FLOAT))', 'lat')
      .addSelect('AVG(CAST(r.lng AS FLOAT))', 'lng')
      .where('CAST(r.lat AS FLOAT) BETWEEN :minLat AND :maxLat', {
        minLat: lat - delta,
        maxLat: lat + delta,
      })
      .andWhere('CAST(r.lng AS FLOAT) BETWEEN :minLng AND :maxLng', {
        minLng: lng - delta,
        maxLng: lng + delta,
      })
      .andWhere('g.estado_actual NOT IN (:...estados)', {
        estados: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      })
      .groupBy('g.id')
      .orderBy('g.creado_en', 'DESC')
      .getRawMany();

    return data.map((g) => ({
      ...g,
      total_reportes: parseInt(g.total_reportes, 10),
      lat: Number(g.lat),
      lng: Number(g.lng),
    }));
  }

  async unbanDevice(device_id: string) {
    const dispositivo = await this.dispositivoRepo.findOne({ where: { device_id } });
    if (!dispositivo) throw new NotFoundException('Dispositivo no encontrado');
    dispositivo.is_banned = false;
    dispositivo.motivo_ban = null;
    await this.dispositivoRepo.save(dispositivo);
    return { ok: true, device_id, is_banned: false };
  }

  async listDevices(page = 1, limit = 20, bannedOnly = false) {
    const where: Record<string, unknown> = {};
    if (bannedOnly) where.is_banned = true;

    const [data, total] = await this.dispositivoRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { ultimo_uso: 'DESC' },
    });
    return { data, total, page, limit };
  }

  // ── Sprint 3: Dashboard KPIs con datos históricos ─────────

  async getDashboardKpis() {
    // KPI base (reutiliza getDashboard)
    const base = await this.getDashboard();

    // KPI 2: Reportes creados por mes — últimos 6 meses
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
    seisMesesAtras.setDate(1);
    seisMesesAtras.setHours(0, 0, 0, 0);

    const reportesPorMesRaw: { mes: string; total: string }[] = await this.reporteRepo
      .createQueryBuilder('r')
      .select("TO_CHAR(DATE_TRUNC('month', r.creado_en), 'YYYY-MM')", 'mes')
      .addSelect('COUNT(r.id)', 'total')
      .where('r.creado_en >= :desde', { desde: seisMesesAtras.toISOString() })
      .groupBy("DATE_TRUNC('month', r.creado_en)")
      .orderBy("DATE_TRUNC('month', r.creado_en)", 'ASC')
      .getRawMany();

    const reportesPorMes = reportesPorMesRaw.map((r) => ({
      mes: r.mes,
      total: parseInt(r.total, 10),
    }));

    // KPI 3: Distribución por categoría (solo reportes con categoría asignada)
    const porCategoriaRaw: { categoria_id: string; nombre: string; total: string }[] =
      await this.reporteRepo
        .createQueryBuilder('r')
        .innerJoin(Categoria, 'c', 'c.id = r.categoria_id')
        .select('r.categoria_id', 'categoria_id')
        .addSelect('c.nombre', 'nombre')
        .addSelect('COUNT(r.id)', 'total')
        .where('r.categoria_id IS NOT NULL')
        .groupBy('r.categoria_id')
        .addGroupBy('c.nombre')
        .orderBy('total', 'DESC')
        .getRawMany();

    const porCategoria = porCategoriaRaw.map((r) => ({
      categoria_id: parseInt(r.categoria_id, 10),
      nombre: r.nombre,
      total: parseInt(r.total, 10),
    }));

    // KPI 4: Casos por estado actual
    const casosPorEstadoRaw: { estado: string; total: string }[] = await this.grupoRepo
      .createQueryBuilder('g')
      .select('g.estado_actual', 'estado')
      .addSelect('COUNT(g.id)', 'total')
      .groupBy('g.estado_actual')
      .getRawMany();

    const casosPorEstado = casosPorEstadoRaw.map((r) => ({
      estado: r.estado,
      total: parseInt(r.total, 10),
    }));

    // KPI 5: Tasa de resolución — Finalizados / (Finalizados + Aceptados + EnTrabajo)
    const finalizados =
      casosPorEstado.find((e) => e.estado === EstadoReporte.Finalizado)?.total ?? 0;
    const totalActivos = casosPorEstado.reduce((acc, e) => acc + e.total, 0);
    const tasaResolucion = totalActivos > 0 ? Math.round((finalizados / totalActivos) * 100) : 0;

    return {
      ...base,
      reportes_por_mes: reportesPorMes,
      por_categoria: porCategoria,
      casos_por_estado: casosPorEstado,
      tasa_resolucion: tasaResolucion,
    };
  }
}

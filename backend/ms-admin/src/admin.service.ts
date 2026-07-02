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

export interface DashboardInsight {
  nivel: 'alerta' | 'atencion' | 'positivo';
  mensaje: string;
  kpi: string;
  link?: string;
}

interface ImagenResult {
  buffer: Buffer;
  contentType: string;
}

// Flujo obligatorio y secuencial de un Caso de Obra (trazabilidad, pedido del
// docente): desde cada estado solo se permite avanzar al/los siguiente(s)
// indicado(s). "Rechazado" no aparece aqui porque aplica solo a Reporte
// individuales antes de agruparse (ver rejectReport()), nunca a un
// GrupoReporte ya en curso.
const TRANSICIONES_VALIDAS: Record<string, EstadoReporte[]> = {
  [EstadoReporte.Aceptado]: [EstadoReporte.ValidacionEnCampo],
  [EstadoReporte.ValidacionEnCampo]: [EstadoReporte.EnTrabajo],
  [EstadoReporte.EnTrabajo]: [EstadoReporte.Finalizado],
  [EstadoReporte.Finalizado]: [],
};

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
    //
    // Nota sobre el texto de estos mensajes: sendRpc() en el gateway enruta
    // las excepciones por subcadena de texto, no por codigo de error tipado
    // (deuda tecnica TD-04). "invalido" cae primero en el chequeo de
    // UnauthorizedException (pensado para tokens), asi que un mensaje de
    // validacion que lo use termina devolviendo 401 en vez de 400. Se usa
    // "deben" a proposito porque solo matchea la rama de BadRequestException.
    if (dto.estado_nuevo) {
      const validos = Object.values(EstadoReporte);
      if (!validos.includes(dto.estado_nuevo as EstadoReporte)) {
        throw new BadRequestException(
          `Los valores de estado deben ser uno de: ${validos.join(', ')}.`,
        );
      }

      // Flujo secuencial obligatorio: no basta con que el valor exista en el
      // enum, tiene que ser una transicion legal desde el estado actual.
      const siguientesValidos = TRANSICIONES_VALIDAS[grupo.estado_actual] ?? [];
      if (!siguientesValidos.includes(dto.estado_nuevo as EstadoReporte)) {
        throw new BadRequestException(
          `Los cambios de estado deben seguir el flujo secuencial: no se puede pasar de "${grupo.estado_actual}" a "${dto.estado_nuevo}". ` +
            (siguientesValidos.length
              ? `Desde "${grupo.estado_actual}" solo se permite pasar a: ${siguientesValidos.join(', ')}.`
              : `"${grupo.estado_actual}" es un estado terminal, no admite más cambios.`),
        );
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
      estado_anterior: dto.estado_nuevo ? grupo.estado_actual : null,
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

  async getDashboard(
    catIn: string[] = [],
    catOut: string[] = [],
    estIn: string[] = [],
    estOut: string[] = [],
  ) {
    let pendientes = 0;
    const reportadoIncluded =
      (estIn.length === 0 || estIn.includes(EstadoReporte.Reportado)) &&
      !estOut.includes(EstadoReporte.Reportado);

    if (reportadoIncluded) {
      const qb = this.reporteRepo
        .createQueryBuilder('r')
        .leftJoin(Categoria, 'c', 'c.id = r.categoria_id')
        .where('r.estado = :estado', { estado: EstadoReporte.Reportado });

      if (catIn.length > 0) qb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
      if (catOut.length > 0)
        qb.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', { catOut });
      pendientes = await qb.getCount();
    }

    let aceptadosHoy = 0;
    const aceptadoIncluded =
      (estIn.length === 0 || estIn.includes(EstadoReporte.Aceptado)) &&
      !estOut.includes(EstadoReporte.Aceptado);

    if (aceptadoIncluded) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const qb = this.reporteRepo
        .createQueryBuilder('r')
        .leftJoin(Categoria, 'c', 'c.id = r.categoria_id')
        .where('r.estado = :estado', { estado: EstadoReporte.Aceptado })
        .andWhere('r.creado_en >= :hoy', { hoy: hoy.toISOString() });

      if (catIn.length > 0) qb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
      if (catOut.length > 0)
        qb.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', { catOut });
      aceptadosHoy = await qb.getCount();
    }

    const qbCasos = this.grupoRepo
      .createQueryBuilder('g')
      .leftJoin(Categoria, 'c', 'c.id = g.categoria_id')
      .where('g.estado_actual NOT IN (:...estadosDefault)', {
        estadosDefault: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      });

    if (catIn.length > 0) qbCasos.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      qbCasos.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', { catOut });
    if (estIn.length > 0) qbCasos.andWhere('g.estado_actual IN (:...estIn)', { estIn });
    if (estOut.length > 0) qbCasos.andWhere('g.estado_actual NOT IN (:...estOut)', { estOut });

    const casosActivos = await qbCasos.getCount();

    // "Obras activas" (arriba) cuenta Casos de Obra (grupos_reportes) — "Reportes
    // activos" es la metrica complementaria a nivel de Reporte individual, se haya
    // agrupado en una obra o no. Mismo patron de filtros que qbCasos para que las
    // dos metricas "activas" respondan igual ante los mismos filtros de categoria/estado.
    const qbReportesActivos = this.reporteRepo
      .createQueryBuilder('r')
      .leftJoin(Categoria, 'c', 'c.id = r.categoria_id')
      .where('r.estado NOT IN (:...estadosFinalesR)', {
        estadosFinalesR: [EstadoReporte.Rechazado, EstadoReporte.Finalizado],
      });

    if (catIn.length > 0) qbReportesActivos.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      qbReportesActivos.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', {
        catOut,
      });
    if (estIn.length > 0) qbReportesActivos.andWhere('r.estado IN (:...estIn)', { estIn });
    if (estOut.length > 0) qbReportesActivos.andWhere('r.estado NOT IN (:...estOut)', { estOut });

    const reportesActivos = await qbReportesActivos.getCount();
    const baneados = await this.dispositivoRepo.count({ where: { is_banned: true } });

    return {
      pendientes,
      aceptados_hoy: aceptadosHoy,
      casos_activos: casosActivos,
      reportes_activos: reportesActivos,
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

  // Resuelve el rango desde/hasta pedido por el filtro del Dashboard.
  // Sin rango, conserva el comportamiento historico: ultimos 6 meses para la
  // serie temporal, historico completo para el resto de agregaciones.
  private resolveRango(desde?: string, hasta?: string) {
    if (!desde && !hasta) return null;
    const d = desde ? new Date(`${desde}T00:00:00.000`) : new Date('2000-01-01T00:00:00.000');
    const h = hasta ? new Date(`${hasta}T23:59:59.999`) : new Date();
    return { desde: d.toISOString(), hasta: h.toISOString() };
  }

  async getDashboardKpis(
    desde?: string,
    hasta?: string,
    granularidad?: 'mes' | 'semana' | 'dia',
    estado_in?: string,
    estado_out?: string,
    categoria_in?: string,
    categoria_out?: string,
  ) {
    const parseList = (val?: string) =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const estIn = parseList(estado_in);
    const estOut = parseList(estado_out);
    const catIn = parseList(categoria_in).map((s) => s.toLowerCase());
    const catOut = parseList(categoria_out).map((s) => s.toLowerCase());

    // KPI base (reutiliza getDashboard) — filtra por categorías y estados seleccionados
    const base = await this.getDashboard(catIn, catOut, estIn, estOut);
    const rango = this.resolveRango(desde, hasta);

    // Fallback consistente para las 3 agregaciones de abajo cuando no hay
    // rango explicito: "ultimos 6 meses", nunca all-time. Antes solo
    // reportesPorPeriodoQb tenia este fallback — porCategoriaQb y
    // casosPorEstadoQb (de donde sale tasa_resolucion) quedaban sin filtro de
    // fecha alguno, mezclando todo el historico con el periodo reciente.
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
    seisMesesAtras.setDate(1);
    seisMesesAtras.setHours(0, 0, 0, 0);
    const desdePorDefecto = seisMesesAtras.toISOString();

    // KPI 2: Reportes creados por periodo — ultimos 6 meses, o el rango pedido
    const unit = granularidad === 'semana' ? 'week' : granularidad === 'dia' ? 'day' : 'month';
    const fmt = unit === 'week' ? `'IYYY-"W"IW'` : unit === 'day' ? `'YYYY-MM-DD'` : `'YYYY-MM'`;

    const reportesPorPeriodoQb = this.reporteRepo
      .createQueryBuilder('r')
      .leftJoin(Categoria, 'c', 'c.id = r.categoria_id')
      .select(`TO_CHAR(DATE_TRUNC('${unit}', r.creado_en), ${fmt})`, 'periodo')
      .addSelect('COUNT(r.id)', 'total')
      .groupBy(`DATE_TRUNC('${unit}', r.creado_en)`)
      .orderBy(`DATE_TRUNC('${unit}', r.creado_en)`, 'ASC');

    if (rango) {
      reportesPorPeriodoQb.where('r.creado_en BETWEEN :desde AND :hasta', rango);
    } else {
      reportesPorPeriodoQb.where('r.creado_en >= :desde', { desde: desdePorDefecto });
    }

    if (catIn.length > 0)
      reportesPorPeriodoQb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      reportesPorPeriodoQb.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', {
        catOut,
      });
    if (estIn.length > 0) reportesPorPeriodoQb.andWhere('r.estado IN (:...estIn)', { estIn });
    if (estOut.length > 0)
      reportesPorPeriodoQb.andWhere('r.estado NOT IN (:...estOut)', { estOut });

    const reportesPorPeriodoRaw: { periodo: string; total: string }[] =
      await reportesPorPeriodoQb.getRawMany();

    const reportesPorPeriodo = reportesPorPeriodoRaw.map((r) => ({
      periodo: r.periodo,
      total: parseInt(r.total, 10),
    }));

    // KPI 2b: Obras finalizadas por periodo — cuenta EVENTOS de transicion a
    // Finalizado dentro de cada periodo (mismo rango/granularidad que
    // reportesPorPeriodoQb, para que sea directamente comparable en escala).
    // Deliberadamente separado de casos_por_estado_historico: ese es un stock
    // (poblacion activa a una fecha), esto es un flujo (cuantas terminaron
    // ESE periodo) — mezclarlos en el mismo arreglo hacia que "Finalizado"
    // mostrara un acumulado de TODA la simulacion (miles) al lado de
    // reportes_por_periodo (cientos), una comparacion sin sentido aunque cada
    // numero fuera correcto por separado.
    const finalizadosPorPeriodoQb = this.actualizacionRepo
      .createQueryBuilder('a')
      .innerJoin(GrupoReporte, 'g', 'g.id = a.grupo_id')
      .leftJoin(Categoria, 'c', 'c.id = g.categoria_id')
      .select(`TO_CHAR(DATE_TRUNC('${unit}', a.creado_en), ${fmt})`, 'periodo')
      .addSelect('COUNT(*)', 'total')
      .where('a.estado_nuevo = :finalizado', { finalizado: EstadoReporte.Finalizado })
      .groupBy(`DATE_TRUNC('${unit}', a.creado_en)`)
      .orderBy(`DATE_TRUNC('${unit}', a.creado_en)`, 'ASC');

    if (rango) {
      finalizadosPorPeriodoQb.andWhere('a.creado_en BETWEEN :desde AND :hasta', rango);
    } else {
      finalizadosPorPeriodoQb.andWhere('a.creado_en >= :desde', { desde: desdePorDefecto });
    }
    if (catIn.length > 0)
      finalizadosPorPeriodoQb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      finalizadosPorPeriodoQb.andWhere(
        '(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)',
        {
          catOut,
        },
      );

    const finalizadosPorPeriodoRaw: { periodo: string; total: string }[] =
      await finalizadosPorPeriodoQb.getRawMany();

    const finalizadosPorPeriodo = finalizadosPorPeriodoRaw.map((r) => ({
      periodo: r.periodo,
      total: parseInt(r.total, 10),
    }));

    // KPI 3: Distribución por categoría (solo reportes con categoría asignada)
    const porCategoriaQb = this.reporteRepo
      .createQueryBuilder('r')
      .innerJoin(Categoria, 'c', 'c.id = r.categoria_id')
      .select('r.categoria_id', 'categoria_id')
      .addSelect('c.nombre', 'nombre')
      .addSelect('COUNT(r.id)', 'total')
      .where('r.categoria_id IS NOT NULL')
      .groupBy('r.categoria_id')
      .addGroupBy('c.nombre')
      .orderBy('total', 'DESC');

    if (rango) {
      porCategoriaQb.andWhere('r.creado_en BETWEEN :desde AND :hasta', rango);
    } else {
      porCategoriaQb.andWhere('r.creado_en >= :desde', { desde: desdePorDefecto });
    }
    if (catIn.length > 0) porCategoriaQb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      porCategoriaQb.andWhere('LOWER(c.nombre) NOT IN (:...catOut)', { catOut });
    if (estIn.length > 0) porCategoriaQb.andWhere('r.estado IN (:...estIn)', { estIn });
    if (estOut.length > 0) porCategoriaQb.andWhere('r.estado NOT IN (:...estOut)', { estOut });

    const porCategoriaRaw: { categoria_id: string; nombre: string; total: string }[] =
      await porCategoriaQb.getRawMany();

    const capitalize = (s: string) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

    const porCategoria = porCategoriaRaw.map((r) => ({
      categoria_id: parseInt(r.categoria_id, 10),
      nombre: capitalize(r.nombre),
      total: parseInt(r.total, 10),
    }));

    // KPI 4: Casos por estado ACTUAL — poblacion completa "a fecha de hasta",
    // no una cohorte por fecha de creacion. "Casos por estado actual" pregunta
    // "cuantos casos hay HOY en cada estado", no "cuantos casos CREADOS en
    // este rango terminaron en cada estado" — por eso el filtro de fecha usa
    // solo un limite superior (<=hasta), igual que getCasosPorEstadoHistorico
    // (mismo criterio: "creado antes de este punto"). Con BETWEEN (cohorte),
    // este total no coincidia con el ultimo punto del historico ni con
    // tasa_resolucion, aunque ambos dicen representar "el estado actual".
    const hastaEfectiva = rango ? rango.hasta : new Date().toISOString();
    const casosPorEstadoQb = this.grupoRepo
      .createQueryBuilder('g')
      .leftJoin(Categoria, 'c', 'c.id = g.categoria_id')
      .select('g.estado_actual', 'estado')
      .addSelect('COUNT(g.id)', 'total')
      .groupBy('g.estado_actual')
      .where('g.creado_en <= :hasta', { hasta: hastaEfectiva });

    if (catIn.length > 0) casosPorEstadoQb.andWhere('LOWER(c.nombre) IN (:...catIn)', { catIn });
    if (catOut.length > 0)
      casosPorEstadoQb.andWhere('(LOWER(c.nombre) NOT IN (:...catOut) OR c.nombre IS NULL)', {
        catOut,
      });
    if (estIn.length > 0) casosPorEstadoQb.andWhere('g.estado_actual IN (:...estIn)', { estIn });
    if (estOut.length > 0)
      casosPorEstadoQb.andWhere('g.estado_actual NOT IN (:...estOut)', { estOut });

    const casosPorEstadoRaw: { estado: string; total: string }[] =
      await casosPorEstadoQb.getRawMany();

    const casosPorEstado = casosPorEstadoRaw.map((r) => ({
      estado: r.estado,
      total: parseInt(r.total, 10),
    }));

    // KPI 5: Tasa de resolución — Finalizados / (Finalizados + Aceptados + EnTrabajo)
    const finalizados =
      casosPorEstado.find((e) => e.estado === EstadoReporte.Finalizado)?.total ?? 0;
    const totalActivos = casosPorEstado.reduce((acc, e) => acc + e.total, 0);
    const tasaResolucion = totalActivos > 0 ? Math.round((finalizados / totalActivos) * 100) : 0;

    const insights = this.buildInsights({
      pendientes: base.pendientes,
      dispositivos_baneados: base.dispositivos_baneados,
      tasa_resolucion: tasaResolucion,
      por_categoria: porCategoria,
    });

    // Dato completo, los 4 estados (incluido Finalizado) para cada dia/periodo
    // del rango — responde "cuantas ordenes y en que estado habia el dia X".
    // El grafico de lineas (StateEvolutionChart) solo ITERA sobre los 3
    // estados activos (ESTADOS_PIPELINE en el frontend) e ignora el resto,
    // asi que mandar Finalizado aca no rompe esa escala — solo lo hace
    // disponible para quien lo necesite (ej. una tabla dia-a-dia sin el
    // problema de escala de una linea, ver DashboardPage.tsx).
    const casosPorEstadoHistorico = await this.getCasosPorEstadoHistorico(
      desde,
      hasta,
      granularidad,
      catIn,
      catOut,
      estIn,
      estOut,
    );

    return {
      ...base,
      reportes_por_periodo: reportesPorPeriodo,
      finalizados_por_periodo: finalizadosPorPeriodo,
      por_categoria: porCategoria,
      casos_por_estado: casosPorEstado,
      casos_por_estado_historico: casosPorEstadoHistorico,
      tasa_resolucion: tasaResolucion,
      rango_aplicado: rango ? { desde, hasta } : null,
      insights,
    };
  }

  // Reconstruye, para cada punto del rango (dia/semana/mes segun granularidad),
  // en que estado estaba cada Caso de Obra EN ESE MOMENTO — a partir de la
  // bitacora ya existente (actualizaciones_caso), sin necesitar una tabla de
  // snapshots nueva. Es una foto de POBLACION (cuantos casos estan sentados en
  // cada estado en ese punto), no un conteo de transiciones ocurridas ese
  // punto: un caso estancado sigue apareciendo en su estado punto tras punto
  // aunque no reciba actualizaciones nuevas — es lo que permite responder
  // "en que etapa se estancan los casos" (ver kpiDescriptions.ts). Default:
  // ultimos 30 dias.
  private async getCasosPorEstadoHistorico(
    desde?: string,
    hasta?: string,
    granularidad: 'mes' | 'semana' | 'dia' = 'dia',
    catIn: string[] = [],
    catOut: string[] = [],
    estIn: string[] = [],
    estOut: string[] = [],
  ): Promise<{ dia: string; estado: string; total: number }[]> {
    const unit = granularidad === 'semana' ? 'week' : granularidad === 'dia' ? 'day' : 'month';
    const step = `1 ${unit}`;
    const fmt = unit === 'week' ? 'IYYY-"W"IW' : unit === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const hastaDate = hasta ? new Date(`${hasta}T00:00:00.000`) : new Date();
    let desdeDate: Date;
    if (desde) {
      desdeDate = new Date(`${desde}T00:00:00.000`);
    } else {
      desdeDate = new Date(hastaDate);
      if (unit === 'month') {
        desdeDate.setMonth(desdeDate.getMonth() - 5);
        desdeDate.setDate(1);
      } else if (unit === 'week') {
        desdeDate.setDate(desdeDate.getDate() - 12 * 7);
      } else {
        desdeDate.setDate(desdeDate.getDate() - 29);
      }
      desdeDate.setHours(0, 0, 0, 0);
    }

    const desdeStr = desde ? desde : desdeDate.toISOString().slice(0, 10);
    const hastaStr = hasta ? hasta : hastaDate.toISOString().slice(0, 10);

    const catInParam = catIn.length > 0 ? catIn : null;
    const catOutParam = catOut.length > 0 ? catOut : null;
    const estInParam = estIn.length > 0 ? estIn : null;
    const estOutParam = estOut.length > 0 ? estOut : null;

    const rows: { dia: string; estado: string; total: string }[] = await this.grupoRepo.query(
      `
      WITH puntos AS (
        SELECT generate_series($1::date, $2::date, $3::interval)::date AS punto
      )
      SELECT TO_CHAR(p.punto, $4) AS dia,
             COALESCE(ultimo.estado_nuevo, 'Aceptado') AS estado,
             COUNT(*) AS total
      FROM puntos p
      CROSS JOIN grupos_reportes g
      LEFT JOIN categorias c ON c.id = g.categoria_id
      LEFT JOIN LATERAL (
        SELECT estado_nuevo FROM actualizaciones_caso a
        WHERE a.grupo_id = g.id AND a.estado_nuevo IS NOT NULL
          AND a.creado_en < p.punto + $3::interval
        ORDER BY a.creado_en DESC, a.id DESC LIMIT 1
      ) ultimo ON true
      WHERE g.creado_en < p.punto + $3::interval
        AND ($5::text[] IS NULL OR LOWER(c.nombre) = ANY($5::text[]))
        AND ($6::text[] IS NULL OR c.nombre IS NULL OR NOT (LOWER(c.nombre) = ANY($6::text[])))
        AND ($7::text[] IS NULL OR COALESCE(ultimo.estado_nuevo, 'Aceptado') = ANY($7::text[]))
        AND ($8::text[] IS NULL OR NOT (COALESCE(ultimo.estado_nuevo, 'Aceptado') = ANY($8::text[])))
      GROUP BY p.punto, COALESCE(ultimo.estado_nuevo, 'Aceptado')
      ORDER BY p.punto
      `,
      [desdeStr, hastaStr, step, fmt, catInParam, catOutParam, estInParam, estOutParam],
    );

    return rows.map((r) => ({
      dia: r.dia,
      estado: r.estado,
      total: parseInt(r.total, 10),
    }));
  }

  // Motor de reglas del Dashboard (Knowledge-driven DSS, Power 2002): evalua los
  // KPIs ya calculados contra umbrales fijos y devuelve acciones sugeridas.
  // Puro y determinista (sin ML) para que sea trivial de testear y defender.
  private buildInsights(kpis: {
    pendientes: number;
    dispositivos_baneados: number;
    tasa_resolucion: number;
    por_categoria: { categoria_id: number; nombre: string; total: number }[];
  }): DashboardInsight[] {
    const insights: DashboardInsight[] = [];

    if (kpis.tasa_resolucion < 70) {
      insights.push({
        nivel: 'alerta',
        kpi: 'tasa_resolucion',
        mensaje: `La tasa de resolución (${kpis.tasa_resolucion}%) está bajo el umbral saludable de 70%. Revisa los casos represados en "En trabajo".`,
        link: `/casos?estado=${EstadoReporte.EnTrabajo}`,
      });
    }

    if (kpis.pendientes > 10) {
      insights.push({
        nivel: 'alerta',
        kpi: 'pendientes',
        mensaje: `Hay ${kpis.pendientes} reportes esperando revisión. Considera asignar más moderadores hoy.`,
        link: '/revisar',
      });
    }

    const totalCategorias = kpis.por_categoria.reduce((acc, c) => acc + c.total, 0);
    const dominante = kpis.por_categoria[0];
    if (dominante && totalCategorias > 0 && dominante.total / totalCategorias > 0.4) {
      const pct = Math.round((dominante.total / totalCategorias) * 100);
      insights.push({
        nivel: 'atencion',
        kpi: 'por_categoria',
        mensaje: `"${dominante.nombre}" concentra el ${pct}% de los reportes del período. Prioriza cuadrillas de esa categoría.`,
      });
    }

    if (kpis.dispositivos_baneados > 5) {
      insights.push({
        nivel: 'atencion',
        kpi: 'dispositivos_baneados',
        mensaje: `${kpis.dispositivos_baneados} dispositivos baneados. Revisa el patrón de abuso reciente.`,
        link: '/usuarios',
      });
    }

    if (insights.length === 0) {
      insights.push({
        nivel: 'positivo',
        kpi: 'general',
        mensaje:
          'El sistema opera dentro de parámetros saludables — sin backlog crítico ni cuellos de botella.',
      });
    }

    const orden: Record<DashboardInsight['nivel'], number> = {
      alerta: 0,
      atencion: 1,
      positivo: 2,
    };
    return insights.sort((a, b) => orden[a.nivel] - orden[b.nivel]).slice(0, 4);
  }
}

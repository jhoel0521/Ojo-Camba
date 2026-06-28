import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as h3 from 'h3-js';
import * as crypto from 'crypto';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Reporte, Dispositivo, Categoria } from '@ojo-camba/common';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { ListReportesDto } from './dto/list-reportes.dto';

interface ImagenResult {
  buffer: Buffer;
  contentType: string;
}

const isExternalUrl = (url: string | null): boolean => url?.startsWith('http') === true;

function imageApiPath(reporte: { id: number; url_imagen: string }): string | null {
  if (!reporte.url_imagen) return null;
  if (isExternalUrl(reporte.url_imagen)) return reporte.url_imagen;
  return `/reportes/${reporte.id}/imagen`;
}

@Injectable()
export class RegisterService implements OnModuleInit {
  private readonly logger = new Logger(RegisterService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
    @InjectRepository(Dispositivo)
    private readonly dispositivoRepo: Repository<Dispositivo>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
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

  async onModuleInit() {
    await this.seedCategorias();

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket '${this.bucket}' verificado`);
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e.name === 'NotFound' || e.name === 'NoSuchBucket') {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket '${this.bucket}' creado`);
      } else {
        this.logger.warn(
          `No se pudo verificar/crear bucket '${this.bucket}': ${(err as Error).message}`,
        );
      }
    }
  }

  async create(dto: CreateReporteDto) {
    const categoria = await this.categoriaRepo.findOne({ where: { id: dto.categoria_id } });
    if (!categoria) {
      throw new BadRequestException(`Categoria ${dto.categoria_id} no existe`);
    }

    let s3Key: string;

    if (dto.imagen_base64) {
      const match = dto.imagen_base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) {
        throw new BadRequestException(
          'Formato de imagen invalido. Se espera data:image/...;base64,...',
        );
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const filename = `${crypto.randomUUID()}.${ext}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: buffer,
          ContentType: `image/${ext}`,
        }),
      );

      s3Key = filename;
    } else {
      throw new BadRequestException('Se requiere imagen en base64');
    }

    const h3res8 = h3.latLngToCell(dto.lat, dto.lng, 8);
    const h3res11 = h3.latLngToCell(dto.lat, dto.lng, 11);
    const h3res13 = h3.latLngToCell(dto.lat, dto.lng, 13);

    if (!h3res8 || !h3res11 || !h3res13) {
      throw new BadRequestException('No se pudieron calcular los indices H3');
    }

    const reporte = this.reporteRepo.create({
      device_id: dto.device_id,
      usuario_id: dto.usuario_id ?? null,
      lat: dto.lat,
      lng: dto.lng,
      categoria_id: dto.categoria_id,
      gravedad: dto.gravedad ?? 'Media',
      h3_res_8: h3res8,
      h3_res_11: h3res11,
      h3_res_13: h3res13,
      url_imagen: s3Key,
    });
    await this.reporteRepo.save(reporte);

    await this.dispositivoRepo.upsert({ device_id: dto.device_id, ultimo_uso: new Date() }, [
      'device_id',
    ]);

    return {
      id: reporte.id,
      h3_res_8: reporte.h3_res_8,
      h3_res_11: reporte.h3_res_11,
      h3_res_13: reporte.h3_res_13,
      url_imagen: `/reportes/${reporte.id}/imagen`,
      estado: reporte.estado,
      creado_en: reporte.creado_en,
    };
  }

  async findById(id: number) {
    const reporte = await this.reporteRepo.findOne({ where: { id } });
    if (!reporte) {
      throw new NotFoundException('Reporte no encontrado');
    }
    const categoria = await this.categoriaRepo.findOne({ where: { id: reporte.categoria_id } });
    return {
      ...reporte,
      url_imagen: imageApiPath(reporte),
      categoria: categoria?.nombre,
    };
  }

  async list(dto: ListReportesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const query = this.reporteRepo.createQueryBuilder('r');
    if (dto.estado) query.andWhere('r.estado = :estado', { estado: dto.estado });
    if (dto.categoria_id) query.andWhere('r.categoria_id = :catId', { catId: dto.categoria_id });

    if (dto.h3_cell && dto.h3_resolution) {
      query.andWhere(`r.h3_res_${dto.h3_resolution} = :h3Cell`, { h3Cell: dto.h3_cell });
    } else if (dto.h3_res_8) {
      query.andWhere('r.h3_res_8 = :h3', { h3: dto.h3_res_8 });
    }
    if (dto.device_id) query.andWhere('r.device_id = :deviceId', { deviceId: dto.device_id });
    if (dto.usuario_id) query.andWhere('r.usuario_id = :userId', { userId: dto.usuario_id });
    if (dto.grupo_id) query.andWhere('r.grupo_id = :grupoId', { grupoId: dto.grupo_id });

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('r.creado_en', 'DESC')
      .getManyAndCount();

    const mapped = data.map((r) => ({
      ...r,
      url_imagen: imageApiPath(r),
    }));

    return { data: mapped, total, page, limit };
  }

  async heatmap(resolution: number = 8) {
    return this.reporteRepo
      .createQueryBuilder('r')
      .select(`r.h3_res_${resolution}`, 'h3_cell')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`r.h3_res_${resolution}`)
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  async heatmapDetailed(resolution: number = 8, soloActivos = true) {
    const qb = this.reporteRepo
      .createQueryBuilder('r')
      .select(`r.h3_res_${resolution}`, 'h3_cell')
      .addSelect('r.categoria_id', 'categoria_id')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`r.h3_res_${resolution}`)
      .addGroupBy('r.categoria_id')
      .orderBy('count', 'DESC');

    if (soloActivos) {
      qb.where('r.estado != :rechazado', { rechazado: 'Rechazado' });
    }

    return qb.getRawMany();
  }

  async getImagenById(reporteId: number): Promise<ImagenResult> {
    const reporte = await this.reporteRepo.findOne({ where: { id: reporteId } });
    if (!reporte?.url_imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }

    if (isExternalUrl(reporte.url_imagen)) {
      throw new NotFoundException('Imagen no gestionada por el sistema');
    }

    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: reporte.url_imagen,
      }),
    );

    const chunks: Buffer[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType ?? 'image/jpeg',
    };
  }

  async vincularDevice(userId: number, deviceId: string) {
    const result = await this.reporteRepo.update(
      { device_id: deviceId, usuario_id: null as unknown as number },
      { usuario_id: userId },
    );
    return { vinculados: result.affected ?? 0 };
  }

  private async seedCategorias() {
    const nombres = ['bache', 'luminaria', 'residuos', 'alcantarillado', 'trafico', 'otro'];
    for (const nombre of nombres) {
      await this.categoriaRepo.upsert({ nombre }, ['nombre']);
    }
  }
}

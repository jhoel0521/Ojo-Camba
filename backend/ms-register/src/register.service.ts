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
import { Client as MinioClient } from 'minio';
import { Reporte } from './entities/reporte.entity';
import { Dispositivo } from './entities/dispositivo.entity';
import { Categoria } from './entities/categoria.entity';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { ListReportesDto } from './dto/list-reportes.dto';

@Injectable()
export class RegisterService implements OnModuleInit {
  private readonly logger = new Logger(RegisterService.name);
  private readonly minioClient: MinioClient;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
    @InjectRepository(Dispositivo)
    private readonly dispositivoRepo: Repository<Dispositivo>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
  ) {
    this.bucket = process.env.MINIO_BUCKET ?? 'reportes';
    this.minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
  }

  async onModuleInit() {
    await this.seedCategorias();

    const exists = await this.minioClient.bucketExists(this.bucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket);
      this.logger.log(`Bucket '${this.bucket}' creado`);
    } else {
      this.logger.log(`Bucket '${this.bucket}' verificado`);
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    await this.minioClient.setBucketPolicy(this.bucket, JSON.stringify(policy));
    this.logger.log(`Politica publica aplicada al bucket '${this.bucket}'`);
  }

  async create(dto: CreateReporteDto) {
    const categoria = await this.categoriaRepo.findOne({ where: { id: dto.categoria_id } });
    if (!categoria) {
      throw new BadRequestException(`Categoria ${dto.categoria_id} no existe`);
    }

    let url_imagen: string;

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

      await this.minioClient.putObject(this.bucket, filename, buffer, buffer.length, {
        'Content-Type': `image/${ext}`,
      });

      url_imagen = `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}/${this.bucket}/${filename}`;
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
      lat: dto.lat,
      lng: dto.lng,
      categoria_id: dto.categoria_id,
      gravedad: dto.gravedad ?? 'Media',
      h3_res_8: h3res8,
      h3_res_11: h3res11,
      h3_res_13: h3res13,
      url_imagen,
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
      url_imagen: reporte.url_imagen,
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
    return { ...reporte, categoria: categoria?.nombre };
  }

  async list(dto: ListReportesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (dto.estado) where.estado = dto.estado;
    if (dto.categoria_id) where.categoria_id = dto.categoria_id;
    if (dto.h3_res_8) where.h3_res_8 = dto.h3_res_8;

    const [data, total] = await this.reporteRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });

    return { data, total, page, limit };
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

  private async seedCategorias() {
    const nombres = ['bache', 'luminaria', 'residuos', 'alcantarillado', 'trafico', 'otro'];
    for (const nombre of nombres) {
      const exists = await this.categoriaRepo.findOne({ where: { nombre } });
      if (!exists) {
        await this.categoriaRepo.save(this.categoriaRepo.create({ nombre }));
      }
    }
  }
}

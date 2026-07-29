import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConfiguracionOperativa,
  CuadrillaMiembro,
  DerivacionCaso,
  ActualizacionCaso,
  EstadoReporte,
  GrupoReporte,
  Reporte,
} from '@ojo-camba/common';
import { In, Repository } from 'typeorm';

export const UMBRALES_OPERATIVOS = {
  VISITAS_META_DIARIA: 'visitas_meta_diaria',
  CARGA_ALERTA: 'carga_alerta',
  CARGA_MAXIMA: 'carga_maxima',
} as const;

const CONFIGURACION_INICIAL = [
  {
    clave: UMBRALES_OPERATIVOS.VISITAS_META_DIARIA,
    valor: 5,
    descripcion: 'Visitas de validación en campo esperadas por cuadrilla y jornada.',
  },
  {
    clave: UMBRALES_OPERATIVOS.CARGA_ALERTA,
    valor: 8,
    descripcion: 'Reportes abiertos desde los que se muestra alerta preventiva.',
  },
  {
    clave: UMBRALES_OPERATIVOS.CARGA_MAXIMA,
    valor: 10,
    descripcion: 'Máximo de reportes abiertos admitidos al asignar una cuadrilla.',
  },
];

@Injectable()
export class OperacionService implements OnModuleInit {
  constructor(
    @InjectRepository(CuadrillaMiembro)
    private readonly miembroRepo: Repository<CuadrillaMiembro>,
    @InjectRepository(ConfiguracionOperativa)
    private readonly configRepo: Repository<ConfiguracionOperativa>,
    @InjectRepository(DerivacionCaso)
    private readonly derivacionRepo: Repository<DerivacionCaso>,
    @InjectRepository(GrupoReporte)
    private readonly grupoRepo: Repository<GrupoReporte>,
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
    @InjectRepository(ActualizacionCaso)
    private readonly actualizacionRepo: Repository<ActualizacionCaso>,
  ) {}

  async onModuleInit() {
    for (const config of CONFIGURACION_INICIAL) {
      const existe = await this.configRepo.findOne({ where: { clave: config.clave } });
      if (!existe) await this.configRepo.save(this.configRepo.create(config));
    }
  }

  async getConfiguracion() {
    return this.configRepo.find({ order: { clave: 'ASC' } });
  }

  async actualizarConfiguracion(clave: string, valor: number, usuarioId: number) {
    if (!Number.isInteger(valor) || valor < 1) {
      throw new BadRequestException('El valor de configuración debe ser un entero positivo.');
    }
    const config = await this.configRepo.findOne({ where: { clave } });
    if (!config) throw new NotFoundException('Configuración operativa no encontrada');
    config.valor = valor;
    config.actualizado_por_usuario_id = usuarioId;
    return this.configRepo.save(config);
  }

  async asignarMiembro(cuadrillaId: number, usuarioId: number, esResponsable = false) {
    if (esResponsable) {
      await this.miembroRepo.update({ cuadrilla_id: cuadrillaId }, { es_responsable: false });
    }
    const existente = await this.miembroRepo.findOne({
      where: { cuadrilla_id: cuadrillaId, usuario_id: usuarioId },
    });
    return this.miembroRepo.save(
      this.miembroRepo.create({
        cuadrilla_id: cuadrillaId,
        usuario_id: usuarioId,
        es_responsable: esResponsable,
        ...existente,
      }),
    );
  }

  async gruposDelTecnico(usuarioId: number, page = 1, limit = 20) {
    const membresias = await this.miembroRepo.find({ where: { usuario_id: usuarioId } });
    const cuadrillaIds = membresias.map((m) => m.cuadrilla_id);
    if (cuadrillaIds.length === 0) return { data: [], total: 0, page, limit };

    const [data, total] = await this.grupoRepo.findAndCount({
      where: { cuadrilla_id: In(cuadrillaIds) },
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });
    const conTotales = await Promise.all(
      data.map(async (grupo) => ({
        ...grupo,
        total_reportes: await this.reporteRepo.count({ where: { grupo_id: grupo.id } }),
      })),
    );
    return { data: conTotales, total, page, limit };
  }

  async verificarAsignacionTecnica(
    grupoId: number,
    usuarioId: number,
    requiereResponsable = false,
  ) {
    const grupo = await this.grupoRepo.findOne({ where: { id: grupoId } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado');
    if (!grupo.cuadrilla_id) {
      throw new BadRequestException('El caso aún no tiene una cuadrilla asignada.');
    }
    const miembro = await this.miembroRepo.findOne({
      where: { cuadrilla_id: grupo.cuadrilla_id, usuario_id: usuarioId },
    });
    if (!miembro || (requiereResponsable && !miembro.es_responsable)) {
      throw new BadRequestException('El técnico no tiene permiso sobre esta cuadrilla.');
    }
    return { grupo, miembro };
  }

  async registrarDerivacion(dto: {
    grupo_id: number;
    entidad_destino: string;
    motivo: string;
    evidencia_url: string;
    usuario_id: number;
  }) {
    await this.verificarAsignacionTecnica(dto.grupo_id, dto.usuario_id, true);
    if (!dto.entidad_destino.trim() || !dto.motivo.trim() || !dto.evidencia_url.trim()) {
      throw new BadRequestException('La derivación requiere entidad, motivo y evidencia.');
    }
    return this.derivacionRepo.save(
      this.derivacionRepo.create({
        grupo_id: dto.grupo_id,
        entidad_destino: dto.entidad_destino.trim(),
        motivo: dto.motivo.trim(),
        evidencia_url: dto.evidencia_url.trim(),
        confirmado_por_usuario_id: dto.usuario_id,
      }),
    );
  }

  async validarCapacidad(cuadrillaId: number, grupoId: number) {
    const configs = await this.configRepo.find();
    const valores = new Map(configs.map((c) => [c.clave, c.valor]));
    const alerta = valores.get(UMBRALES_OPERATIVOS.CARGA_ALERTA) ?? 8;
    const maxima = valores.get(UMBRALES_OPERATIVOS.CARGA_MAXIMA) ?? 10;
    const abiertos = await this.reporteRepo
      .createQueryBuilder('r')
      .innerJoin(GrupoReporte, 'g', 'g.id = r.grupo_id')
      .where('g.cuadrilla_id = :cuadrillaId', { cuadrillaId })
      .andWhere('g.id != :grupoId', { grupoId })
      .andWhere('r.estado NOT IN (:...terminales)', {
        terminales: [EstadoReporte.Finalizado, EstadoReporte.Rechazado],
      })
      .getCount();
    const entrantes = await this.reporteRepo.count({ where: { grupo_id: grupoId } });
    const proyeccion = abiertos + entrantes;
    return {
      reportes_abiertos: abiertos,
      reportes_entrantes: entrantes,
      proyeccion,
      alerta_preventiva: proyeccion >= alerta,
      admite_asignacion: proyeccion <= maxima,
      umbral_alerta: alerta,
      umbral_maximo: maxima,
    };
  }

  /** KPI diario: una visita requiere evidencia GPS en la bitácora de campo. */
  async indicadoresCuadrilla(cuadrillaId: number) {
    const configs = await this.configRepo.find();
    const valores = new Map(configs.map((c) => [c.clave, c.valor]));
    const inicioJornada = new Date();
    inicioJornada.setHours(0, 0, 0, 0);
    const visitas_hoy = await this.actualizacionRepo
      .createQueryBuilder('a')
      .innerJoin(GrupoReporte, 'g', 'g.id = a.grupo_id')
      .where('g.cuadrilla_id = :cuadrillaId', { cuadrillaId })
      .andWhere('a.creado_en >= :inicioJornada', { inicioJornada })
      .andWhere('a.lat_actualizada IS NOT NULL')
      .andWhere('a.lng_actualizada IS NOT NULL')
      .getCount();
    const carga = await this.reporteRepo
      .createQueryBuilder('r')
      .innerJoin(GrupoReporte, 'g', 'g.id = r.grupo_id')
      .where('g.cuadrilla_id = :cuadrillaId', { cuadrillaId })
      .andWhere('r.estado NOT IN (:...terminales)', {
        terminales: [EstadoReporte.Finalizado, EstadoReporte.Rechazado],
      })
      .getCount();
    const meta_visitas = valores.get(UMBRALES_OPERATIVOS.VISITAS_META_DIARIA) ?? 5;
    const alerta_carga = valores.get(UMBRALES_OPERATIVOS.CARGA_ALERTA) ?? 8;
    const maximo_carga = valores.get(UMBRALES_OPERATIVOS.CARGA_MAXIMA) ?? 10;
    return {
      cuadrilla_id: cuadrillaId,
      visitas_hoy,
      meta_visitas,
      meta_visitas_cumplida: visitas_hoy >= meta_visitas,
      reportes_abiertos: carga,
      alerta_carga: carga >= alerta_carga,
      solicitud_apoyo: carga >= maximo_carga,
      umbral_alerta: alerta_carga,
      umbral_maximo: maximo_carga,
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConfiguracionOperativa,
  CuadrillaMiembro,
  DerivacionCaso,
  ActualizacionCaso,
  DecisionPropuestaVisita,
  EstadoCaso,
  EstadoReporte,
  GrupoReporte,
  Reporte,
  ROLES,
  PropuestaVisita,
  UsuarioRol,
  VisitaCaso,
  puedeTransicionarCaso,
} from '@ojo-camba/common';
import { In, IsNull, Repository } from 'typeorm';

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
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
    @InjectRepository(VisitaCaso)
    private readonly visitaRepo: Repository<VisitaCaso>,
    @InjectRepository(PropuestaVisita)
    private readonly propuestaRepo: Repository<PropuestaVisita>,
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

  async contextoOperativo(usuarioId: number) {
    const membresias = await this.miembroRepo.find({ where: { usuario_id: usuarioId } });
    return {
      cuadrillas: membresias.map((membresia) => ({
        cuadrilla_id: membresia.cuadrilla_id,
        es_responsable: membresia.es_responsable,
      })),
      es_responsable: membresias.some((membresia) => membresia.es_responsable),
    };
  }

  /** Bandeja "Mis obras": solamente Casos que tienen una visita asignada al técnico. */
  async visitasDelTecnico(usuarioId: number, page = 1, limit = 20, fecha?: string) {
    const pagina = Math.max(1, page);
    const limite = Math.min(Math.max(1, limit), 100);
    const where = {
      tecnico_id: usuarioId,
      cerrada_en: IsNull(),
      ...(fecha ? { fecha_planificada: fecha } : {}),
    };
    const [visitas, total] = await this.visitaRepo.findAndCount({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
      order: { fecha_planificada: 'ASC', orden_ruta: 'ASC', id: 'ASC' },
    });
    if (visitas.length === 0) return { data: [], total, page: pagina, limit: limite };

    const grupos = await this.grupoRepo.find({
      where: { id: In(visitas.map((visita) => visita.grupo_id)) },
    });
    const porGrupo = new Map(grupos.map((grupo) => [grupo.id, grupo]));
    return {
      data: visitas.map((visita) => ({
        ...visita,
        caso: porGrupo.get(visita.grupo_id) ?? null,
      })),
      total,
      page: pagina,
      limit: limite,
    };
  }

  /** Bandeja del responsable: visitas abiertas de sus propias cuadrillas. */
  async visitasDeCuadrillaResponsable(usuarioId: number, page = 1, limit = 100) {
    const membresias = await this.miembroRepo.find({
      where: { usuario_id: usuarioId, es_responsable: true },
    });
    const cuadrillaIds = membresias.map((membresia) => membresia.cuadrilla_id);
    const pagina = Math.max(1, page);
    const limite = Math.min(Math.max(1, limit), 100);
    if (cuadrillaIds.length === 0) return { data: [], total: 0, page: pagina, limit: limite };

    const [visitas, total] = await this.visitaRepo.findAndCount({
      where: { cuadrilla_id: In(cuadrillaIds), cerrada_en: IsNull() },
      skip: (pagina - 1) * limite,
      take: limite,
      order: { fecha_planificada: 'ASC', orden_ruta: 'ASC', id: 'ASC' },
    });
    const grupos = await this.grupoRepo.find({
      where: { id: In(visitas.map((visita) => visita.grupo_id)) },
    });
    const porGrupo = new Map(grupos.map((grupo) => [grupo.id, grupo]));
    return {
      data: visitas.map((visita) => ({ ...visita, caso: porGrupo.get(visita.grupo_id) ?? null })),
      total,
      page: pagina,
      limit: limite,
    };
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
    const roles = await this.usuarioRolRepo.find({
      where: { usuario_id: usuarioId },
      relations: ['rol'],
    });
    if (!roles.some((relacion) => relacion.rol.nombre === ROLES.TECNICO)) {
      throw new BadRequestException('El integrante de cuadrilla debe tener el rol tecnico.');
    }
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

  /**
   * Crear la visita abierta de un Caso cuando el sistema le asigna cuadrilla.
   * La restricción parcial de base impide duplicar la visita activa si el
   * proceso de asignación se reintenta.
   */
  async crearVisitaAlAsignarCuadrilla(grupoId: number, cuadrillaId: number) {
    const existente = await this.visitaRepo.findOne({
      where: { grupo_id: grupoId, cerrada_en: IsNull() },
    });
    if (existente?.cuadrilla_id === cuadrillaId) return existente;
    if (existente) {
      existente.cerrada_en = new Date();
      await this.visitaRepo.save(existente);
    }

    return this.visitaRepo.save(
      this.visitaRepo.create({
        grupo_id: grupoId,
        cuadrilla_id: cuadrillaId,
        tecnico_id: null,
        asignado_por_usuario_id: null,
        fecha_planificada: null,
        orden_ruta: null,
        llegada_en: null,
        lat_llegada: null,
        lng_llegada: null,
        cerrada_en: null,
      }),
    );
  }

  /** Responsable distribuye una visita únicamente dentro de su cuadrilla. */
  async asignarVisitaTecnico(dto: {
    visita_id: number;
    responsable_id: number;
    tecnico_id: number;
    fecha_planificada: string;
    orden_ruta: number;
    motivo?: string;
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.fecha_planificada)) {
      throw new BadRequestException('La fecha planificada debe usar el formato YYYY-MM-DD.');
    }
    if (!Number.isInteger(dto.orden_ruta) || dto.orden_ruta < 1) {
      throw new BadRequestException('El orden de ruta debe ser un entero mayor o igual a 1.');
    }

    const visita = await this.visitaRepo.findOne({ where: { id: dto.visita_id } });
    if (!visita || visita.cerrada_en) throw new NotFoundException('Visita abierta no encontrada.');

    const responsable = await this.miembroRepo.findOne({
      where: { cuadrilla_id: visita.cuadrilla_id, usuario_id: dto.responsable_id },
    });
    if (!responsable?.es_responsable) {
      throw new ForbiddenException(
        'Solo el responsable de esta cuadrilla puede distribuir visitas.',
      );
    }

    const tecnico = await this.miembroRepo.findOne({
      where: { cuadrilla_id: visita.cuadrilla_id, usuario_id: dto.tecnico_id },
    });
    if (!tecnico) {
      throw new BadRequestException('El técnico seleccionado no pertenece a esta cuadrilla.');
    }

    visita.tecnico_id = dto.tecnico_id;
    visita.asignado_por_usuario_id = dto.responsable_id;
    visita.fecha_planificada = dto.fecha_planificada;
    visita.orden_ruta = dto.orden_ruta;
    const guardada = await this.visitaRepo.save(visita);

    await this.actualizacionRepo.save(
      this.actualizacionRepo.create({
        grupo_id: visita.grupo_id,
        usuario_id: dto.responsable_id,
        comentario:
          dto.motivo?.trim() ||
          `Visita ${visita.id} asignada al técnico ${dto.tecnico_id} para ${dto.fecha_planificada}.`,
        estado_anterior: null,
        estado_nuevo: null,
      }),
    );
    return guardada;
  }

  /** El técnico registra llegada únicamente sobre una visita que le fue asignada. */
  async registrarLlegada(dto: { visita_id: number; tecnico_id: number; lat: number; lng: number }) {
    if (!Number.isFinite(dto.lat) || dto.lat < -90 || dto.lat > 90) {
      throw new BadRequestException('La latitud de llegada no es válida.');
    }
    if (!Number.isFinite(dto.lng) || dto.lng < -180 || dto.lng > 180) {
      throw new BadRequestException('La longitud de llegada no es válida.');
    }

    const visita = await this.visitaRepo.findOne({ where: { id: dto.visita_id } });
    if (!visita || visita.cerrada_en) throw new NotFoundException('Visita abierta no encontrada.');
    if (visita.tecnico_id !== dto.tecnico_id) {
      throw new ForbiddenException('Solo el técnico asignado puede registrar la llegada.');
    }

    visita.llegada_en = new Date();
    visita.lat_llegada = dto.lat;
    visita.lng_llegada = dto.lng;
    const guardada = await this.visitaRepo.save(visita);
    await this.actualizacionRepo.save(
      this.actualizacionRepo.create({
        grupo_id: visita.grupo_id,
        usuario_id: dto.tecnico_id,
        comentario: `Llegada registrada en visita ${visita.id}.`,
        estado_anterior: null,
        estado_nuevo: null,
        lat_actualizada: dto.lat,
        lng_actualizada: dto.lng,
      }),
    );
    return guardada;
  }

  /**
   * Una parada de ruta representa un Caso, nunca oculta los reportes que la
   * originaron. El técnico asignado puede ver su agrupación; el responsable de
   * la misma cuadrilla también la consulta para distribuir y revisar trabajo.
   */
  async detalleVisitaParaTecnico(visitaId: number, usuarioId: number) {
    const visita = await this.visitaRepo.findOne({ where: { id: visitaId } });
    if (!visita) throw new NotFoundException('Visita no encontrada.');

    if (visita.tecnico_id !== usuarioId) {
      const miembro = await this.miembroRepo.findOne({
        where: { cuadrilla_id: visita.cuadrilla_id, usuario_id: usuarioId },
      });
      if (!miembro?.es_responsable) {
        throw new ForbiddenException('No tienes permiso para ver esta visita.');
      }
    }

    const grupo = await this.grupoRepo.findOne({ where: { id: visita.grupo_id } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado.');
    const reportes = await this.reporteRepo.find({
      where: { grupo_id: grupo.id },
      order: { creado_en: 'ASC' },
    });

    return {
      visita,
      caso: grupo,
      agrupacion: {
        total_reportes: reportes.length,
        reportes,
      },
    };
  }

  /** El técnico solo propone resultados sobre una visita propia y con evidencia requerida. */
  async proponerResultadoVisita(dto: {
    visita_id: number;
    tecnico_id: number;
    estado_propuesto: EstadoCaso;
    comentario: string;
    evidencia_url?: string;
    entidad_destino?: string;
    categoria_rechazo_id?: number;
  }) {
    const visita = await this.visitaRepo.findOne({ where: { id: dto.visita_id } });
    if (!visita || visita.cerrada_en) throw new NotFoundException('Visita abierta no encontrada.');
    if (visita.tecnico_id !== dto.tecnico_id) {
      throw new ForbiddenException('Solo el técnico asignado puede proponer el resultado.');
    }
    if (!dto.comentario.trim())
      throw new BadRequestException('La propuesta requiere una descripción.');

    const estadosProponibles = [
      EstadoCaso.EnTrabajo,
      EstadoCaso.Reencolado,
      EstadoCaso.Derivado,
      EstadoCaso.RechazadoCampo,
      EstadoCaso.Finalizado,
    ];
    if (!estadosProponibles.includes(dto.estado_propuesto)) {
      throw new BadRequestException('El resultado propuesto no corresponde a una visita de campo.');
    }
    if (
      [EstadoCaso.Finalizado, EstadoCaso.Derivado, EstadoCaso.RechazadoCampo].includes(
        dto.estado_propuesto,
      ) &&
      !dto.evidencia_url?.trim()
    ) {
      throw new BadRequestException('La decisión terminal requiere evidencia.');
    }
    if (dto.estado_propuesto === EstadoCaso.Derivado && !dto.entidad_destino?.trim()) {
      throw new BadRequestException('La derivación requiere entidad de destino.');
    }
    if (dto.estado_propuesto === EstadoCaso.RechazadoCampo && !dto.categoria_rechazo_id) {
      throw new BadRequestException('El rechazo de campo requiere una categoría.');
    }

    // EnTrabajo y Reencolado no son decisiones terminales: el técnico las
    // registra directamente después de la visita. Las demás quedan pendientes
    // de la autoridad que corresponda.
    if ([EstadoCaso.EnTrabajo, EstadoCaso.Reencolado].includes(dto.estado_propuesto)) {
      const grupo = await this.grupoRepo.findOne({ where: { id: visita.grupo_id } });
      if (!grupo) throw new NotFoundException('Caso de Obra no encontrado.');
      const estadoActual = grupo.estado_actual as EstadoCaso;
      if (!puedeTransicionarCaso(estadoActual, dto.estado_propuesto)) {
        throw new BadRequestException(
          `El resultado no puede aplicarse desde el estado ${grupo.estado_actual}.`,
        );
      }
      grupo.estado_actual = dto.estado_propuesto;
      await this.grupoRepo.save(grupo);
      await this.reporteRepo.update({ grupo_id: grupo.id }, { estado: EstadoReporte.Aceptado });
      visita.cerrada_en = new Date();
      await this.visitaRepo.save(visita);
      await this.actualizacionRepo.save(
        this.actualizacionRepo.create({
          grupo_id: visita.grupo_id,
          usuario_id: dto.tecnico_id,
          comentario: `Resultado de visita: ${dto.estado_propuesto}. ${dto.comentario.trim()}`,
          estado_anterior: estadoActual,
          estado_nuevo: dto.estado_propuesto,
          url_imagen: dto.evidencia_url?.trim() || null,
        }),
      );
      return { requiere_confirmacion: false, estado_actual: dto.estado_propuesto };
    }

    const propuesta = await this.propuestaRepo.save(
      this.propuestaRepo.create({
        visita_id: visita.id,
        estado_propuesto: dto.estado_propuesto,
        comentario: dto.comentario.trim(),
        entidad_destino: dto.entidad_destino?.trim() || null,
        categoria_rechazo_id: dto.categoria_rechazo_id ?? null,
        evidencia_url: dto.evidencia_url?.trim() || null,
        propuesto_por_usuario_id: dto.tecnico_id,
        decision: DecisionPropuestaVisita.Pendiente,
        decidido_por_usuario_id: null,
        motivo_decision: null,
        decidida_en: null,
      }),
    );
    await this.actualizacionRepo.save(
      this.actualizacionRepo.create({
        grupo_id: visita.grupo_id,
        usuario_id: dto.tecnico_id,
        comentario: `Propuesta de ${dto.estado_propuesto}: ${dto.comentario.trim()}`,
        estado_anterior: null,
        estado_nuevo: null,
        url_imagen: propuesta.evidencia_url,
      }),
    );
    return propuesta;
  }

  /**
   * Confirma una propuesta terminal. Finalizado y Derivado corresponden al
   * responsable de la cuadrilla; RechazadoCampo requiere coordinador operativo.
   */
  async confirmarPropuestaVisita(dto: {
    propuesta_id: number;
    usuario_id: number;
    motivo_decision?: string;
  }) {
    const propuesta = await this.propuestaRepo.findOne({ where: { id: dto.propuesta_id } });
    if (!propuesta) throw new NotFoundException('Propuesta de visita no encontrada.');
    if (propuesta.decision !== DecisionPropuestaVisita.Pendiente) {
      throw new BadRequestException('La propuesta ya fue resuelta.');
    }
    const visita = await this.visitaRepo.findOne({ where: { id: propuesta.visita_id } });
    if (!visita || visita.cerrada_en) throw new NotFoundException('Visita abierta no encontrada.');
    const grupo = await this.grupoRepo.findOne({ where: { id: visita.grupo_id } });
    if (!grupo) throw new NotFoundException('Caso de Obra no encontrado.');
    if (
      ![EstadoCaso.Finalizado, EstadoCaso.Derivado, EstadoCaso.RechazadoCampo].includes(
        propuesta.estado_propuesto,
      )
    ) {
      throw new BadRequestException('Solo se confirman propuestas terminales.');
    }

    if (propuesta.estado_propuesto === EstadoCaso.RechazadoCampo) {
      const roles = await this.usuarioRolRepo.find({
        where: { usuario_id: dto.usuario_id },
        relations: ['rol'],
      });
      if (!roles.some((relacion) => relacion.rol.nombre === ROLES.COORDINADOR_OPERATIVO)) {
        throw new ForbiddenException('Solo el coordinador operativo confirma rechazos de campo.');
      }
    } else {
      const miembro = await this.miembroRepo.findOne({
        where: { cuadrilla_id: visita.cuadrilla_id, usuario_id: dto.usuario_id },
      });
      if (!miembro?.es_responsable) {
        throw new ForbiddenException(
          'Solo el responsable de esta cuadrilla confirma esta propuesta.',
        );
      }
    }

    const estadoActual = grupo.estado_actual as EstadoCaso;
    if (!puedeTransicionarCaso(estadoActual, propuesta.estado_propuesto)) {
      throw new BadRequestException(
        `La propuesta no puede confirmarse desde el estado ${grupo.estado_actual}.`,
      );
    }

    grupo.estado_actual = propuesta.estado_propuesto;
    if (propuesta.estado_propuesto === EstadoCaso.RechazadoCampo) {
      grupo.categoria_rechazo_campo_id = propuesta.categoria_rechazo_id;
      grupo.rechazado_campo_por_usuario_id = dto.usuario_id;
      grupo.rechazado_campo_en = new Date();
    }
    await this.grupoRepo.save(grupo);
    await this.reporteRepo.update(
      { grupo_id: grupo.id },
      {
        estado:
          propuesta.estado_propuesto === EstadoCaso.Finalizado
            ? EstadoReporte.Finalizado
            : propuesta.estado_propuesto === EstadoCaso.RechazadoCampo
              ? EstadoReporte.Rechazado
              : EstadoReporte.Aceptado,
      },
    );
    propuesta.decision = DecisionPropuestaVisita.Confirmada;
    propuesta.decidido_por_usuario_id = dto.usuario_id;
    propuesta.motivo_decision = dto.motivo_decision?.trim() || null;
    propuesta.decidida_en = new Date();
    await this.propuestaRepo.save(propuesta);
    visita.cerrada_en = new Date();
    await this.visitaRepo.save(visita);

    if (propuesta.estado_propuesto === EstadoCaso.Derivado) {
      await this.derivacionRepo.save(
        this.derivacionRepo.create({
          grupo_id: grupo.id,
          entidad_destino: propuesta.entidad_destino ?? '',
          motivo: propuesta.comentario,
          evidencia_url: propuesta.evidencia_url ?? '',
          confirmado_por_usuario_id: dto.usuario_id,
        }),
      );
    }
    await this.actualizacionRepo.save(
      this.actualizacionRepo.create({
        grupo_id: grupo.id,
        usuario_id: dto.usuario_id,
        comentario: `Propuesta de ${propuesta.estado_propuesto} confirmada.`,
        estado_anterior: estadoActual,
        estado_nuevo: propuesta.estado_propuesto,
        url_imagen: propuesta.evidencia_url,
      }),
    );
    return propuesta;
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

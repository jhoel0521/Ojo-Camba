import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Cuadrilla,
  CuadrillaMiembro,
  ROLES,
  Rol,
  RolNombre,
  SolicitudTi,
  SolicitudTiUsuario,
  Usuario,
  UsuarioRol,
  RefreshToken,
  tieneAlgunRol,
} from '@ojo-camba/common';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';

const TIPOS_SOLICITUD = ['alta', 'cambio', 'baja', 'conformacion_cuadrilla'] as const;
const ROLES_GESTIONABLES = Object.values(ROLES);

type CambioRol = { usuario_id: number; roles: string[] };
type DatosCuadrilla = {
  cuadrilla_id?: number;
  nombre?: string;
  especialidad_id?: number | null;
  responsable_usuario_id: number;
  miembro_usuario_ids: number[];
};

export type AplicarSolicitudTiDto = {
  tipo: string;
  referencia_carta: string;
  comentario?: string;
  cambios?: CambioRol[];
  cuadrilla?: DatosCuadrilla;
  ejecutado_por_usuario_id: number;
};

@Injectable()
export class GestionAccesosService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(UsuarioRol) private readonly usuarioRolRepo: Repository<UsuarioRol>,
    @InjectRepository(Rol) private readonly rolRepo: Repository<Rol>,
    @InjectRepository(SolicitudTi) private readonly solicitudRepo: Repository<SolicitudTi>,
    @InjectRepository(SolicitudTiUsuario)
    private readonly solicitudUsuarioRepo: Repository<SolicitudTiUsuario>,
  ) {}

  async listCiudadanos(page = 1, limit = 20, q?: string) {
    const where = q ? [{ nombre: ILike(`%${q}%`) }, { email: ILike(`%${q}%`) }] : undefined;
    const [data, total] = await this.usuarioRepo.findAndCount({
      select: ['id', 'nombre', 'email', 'puntos', 'nivel_id', 'creado_en'],
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });

    const conRoles = await Promise.all(
      data.map(async (usuario) => ({
        ...usuario,
        roles: await this.rolesDeUsuario(this.usuarioRolRepo.manager, usuario.id),
      })),
    );
    // Todo alta pública recibe ciudadano. El filtro protege también datos históricos.
    return {
      data: conRoles.filter((usuario) => usuario.roles.includes(ROLES.CIUDADANO)),
      total,
      page,
      limit,
    };
  }

  listRolesGestionables() {
    return ROLES_GESTIONABLES.map((nombre) => ({
      nombre,
      obligatorio: nombre === ROLES.CIUDADANO,
      gestionable: nombre !== ROLES.CIUDADANO,
    }));
  }

  async aplicarSolicitud(dto: AplicarSolicitudTiDto) {
    this.validarSolicitud(dto);
    return this.dataSource.transaction((manager) => this.aplicarEnTransaccion(manager, dto));
  }

  async listSolicitudes(page = 1, limit = 20) {
    const [data, total] = await this.solicitudRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });
    const detalles = await Promise.all(
      data.map(async (solicitud) => ({
        ...solicitud,
        usuarios: await this.solicitudUsuarioRepo.find({
          where: { solicitud_id: solicitud.id },
          order: { id: 'ASC' },
        }),
      })),
    );
    return { data: detalles, total, page, limit };
  }

  private async aplicarEnTransaccion(manager: EntityManager, dto: AplicarSolicitudTiDto) {
    await this.verificarEjecutorTi(manager, dto.ejecutado_por_usuario_id);
    const rolesPorNombre = await this.obtenerRolesPorNombre(manager);
    const cambios = dto.cambios ?? [];
    const rolesFinales = new Map<number, string[]>();
    const rolesAnteriores = new Map<number, string[]>();

    for (const cambio of cambios) {
      const usuario = await manager.findOne(Usuario, { where: { id: cambio.usuario_id } });
      if (!usuario) throw new NotFoundException(`Usuario ${cambio.usuario_id} no encontrado`);
      const antes = await this.rolesDeUsuario(manager, usuario.id);
      const despues = this.normalizarRolesSolicitados(cambio.roles);
      rolesAnteriores.set(usuario.id, antes);
      rolesFinales.set(usuario.id, despues);
    }

    const miembrosCuadrilla = this.miembrosDeCuadrilla(dto.cuadrilla);
    for (const usuarioId of miembrosCuadrilla.ids) {
      if (!rolesAnteriores.has(usuarioId)) {
        const usuario = await manager.findOne(Usuario, { where: { id: usuarioId } });
        if (!usuario) throw new NotFoundException(`Usuario ${usuarioId} no encontrado`);
        const actuales = await this.rolesDeUsuario(manager, usuarioId);
        rolesAnteriores.set(usuarioId, actuales);
        rolesFinales.set(usuarioId, actuales);
      }
    }

    for (const [usuarioId, roles] of rolesFinales) {
      await manager.delete(UsuarioRol, { usuario_id: usuarioId });
      await manager.save(
        UsuarioRol,
        roles.map((nombre) => ({ usuario_id: usuarioId, rol_id: rolesPorNombre.get(nombre)!.id })),
      );
      // Los guards consultan los roles vigentes en cada petición. Al revocar los
      // refresh tokens también se impide renovar una sesión que antes era privilegiada.
      await manager.update(
        RefreshToken,
        { usuario_id: usuarioId, revoked: false },
        { revoked: true },
      );
    }

    const solicitud = await manager.save(
      SolicitudTi,
      manager.create(SolicitudTi, {
        tipo: dto.tipo.trim(),
        referencia_carta: dto.referencia_carta.trim(),
        comentario: dto.comentario?.trim() || null,
        ejecutado_por_usuario_id: dto.ejecutado_por_usuario_id,
        resultado: 'aplicada',
      }),
    );

    let cuadrillaId: number | null = null;
    if (dto.cuadrilla) {
      cuadrillaId = await this.guardarCuadrilla(manager, dto.cuadrilla, rolesFinales);
      solicitud.cuadrilla_id = cuadrillaId;
      await manager.save(SolicitudTi, solicitud);
    }

    const detalles = [...rolesFinales.entries()].map(([usuarioId, rolesDespues]) =>
      manager.create(SolicitudTiUsuario, {
        solicitud_id: solicitud.id,
        usuario_id: usuarioId,
        roles_antes: rolesAnteriores.get(usuarioId) ?? [],
        roles_despues: rolesDespues,
        participacion_cuadrilla:
          dto.cuadrilla?.responsable_usuario_id === usuarioId
            ? 'responsable'
            : miembrosCuadrilla.ids.includes(usuarioId)
              ? 'miembro'
              : null,
      }),
    );
    await manager.save(SolicitudTiUsuario, detalles);

    return { ...solicitud, cuadrilla_id: cuadrillaId, usuarios_afectados: detalles.length };
  }

  private validarSolicitud(dto: AplicarSolicitudTiDto) {
    if (!TIPOS_SOLICITUD.includes(dto.tipo as (typeof TIPOS_SOLICITUD)[number])) {
      throw new BadRequestException('Tipo de solicitud invalido.');
    }
    if (!dto.referencia_carta?.trim()) {
      throw new BadRequestException('La referencia de carta es requerida.');
    }
    const cambios = dto.cambios ?? [];
    if (cambios.length === 0 && !dto.cuadrilla) {
      throw new BadRequestException(
        'La solicitud debe afectar al menos una persona o una cuadrilla.',
      );
    }
    if (new Set(cambios.map((cambio) => cambio.usuario_id)).size !== cambios.length) {
      throw new BadRequestException('Un usuario solo puede aparecer una vez en la solicitud.');
    }
    for (const cambio of cambios) {
      if (!Number.isInteger(cambio.usuario_id) || !Array.isArray(cambio.roles)) {
        throw new BadRequestException('El cambio de rol es invalido.');
      }
      const rolesInvalidos = cambio.roles.filter(
        (rol) => !ROLES_GESTIONABLES.includes(rol as RolNombre) || rol === ROLES.CIUDADANO,
      );
      if (rolesInvalidos.length > 0) {
        throw new BadRequestException(`Roles no gestionables: ${rolesInvalidos.join(', ')}.`);
      }
    }
    if (dto.cuadrilla) {
      const { responsable_usuario_id, miembro_usuario_ids } = dto.cuadrilla;
      if (!Number.isInteger(responsable_usuario_id) || !Array.isArray(miembro_usuario_ids)) {
        throw new BadRequestException('La composicion de cuadrilla es invalida.');
      }
      if (!dto.cuadrilla.cuadrilla_id && !dto.cuadrilla.nombre?.trim()) {
        throw new BadRequestException('Una cuadrilla nueva requiere nombre.');
      }
    }
  }

  private normalizarRolesSolicitados(roles: string[]) {
    return [ROLES.CIUDADANO, ...new Set(roles)] as string[];
  }

  private async obtenerRolesPorNombre(manager: EntityManager) {
    const roles = await manager.find(Rol);
    const rolesPorNombre = new Map(roles.map((rol) => [rol.nombre, rol]));
    const faltantes = ROLES_GESTIONABLES.filter((nombre) => !rolesPorNombre.has(nombre));
    if (faltantes.length > 0) {
      throw new BadRequestException(`No existen roles configurados: ${faltantes.join(', ')}.`);
    }
    return rolesPorNombre;
  }

  private async verificarEjecutorTi(manager: EntityManager, usuarioId: number) {
    const roles = await this.rolesDeUsuario(manager, usuarioId);
    if (!tieneAlgunRol(roles, [ROLES.ENCARGADO_IT])) {
      throw new ForbiddenException('Solo el encargado TI puede gestionar accesos.');
    }
  }

  private async rolesDeUsuario(manager: EntityManager, usuarioId: number) {
    const relaciones = await manager.find(UsuarioRol, {
      where: { usuario_id: usuarioId },
      relations: ['rol'],
    });
    return relaciones.map((relacion) => relacion.rol.nombre).sort();
  }

  private miembrosDeCuadrilla(cuadrilla?: DatosCuadrilla) {
    if (!cuadrilla) return { ids: [] as number[] };
    const ids = [...new Set([...cuadrilla.miembro_usuario_ids, cuadrilla.responsable_usuario_id])];
    if (ids.length === 0) throw new BadRequestException('La cuadrilla necesita tecnicos.');
    return { ids };
  }

  private async guardarCuadrilla(
    manager: EntityManager,
    datos: DatosCuadrilla,
    rolesFinales: Map<number, string[]>,
  ) {
    const miembros = this.miembrosDeCuadrilla(datos).ids;
    for (const usuarioId of miembros) {
      const roles = rolesFinales.get(usuarioId) ?? (await this.rolesDeUsuario(manager, usuarioId));
      if (!roles.includes(ROLES.TECNICO)) {
        throw new BadRequestException(
          `El usuario ${usuarioId} debe tener el rol tecnico para integrar la cuadrilla.`,
        );
      }
    }

    let cuadrilla: Cuadrilla;
    if (datos.cuadrilla_id) {
      const existente = await manager.findOne(Cuadrilla, { where: { id: datos.cuadrilla_id } });
      if (!existente) throw new NotFoundException('Cuadrilla no encontrada');
      if (datos.nombre?.trim()) existente.nombre = datos.nombre.trim();
      if (datos.especialidad_id !== undefined) existente.especialidad_id = datos.especialidad_id;
      cuadrilla = await manager.save(Cuadrilla, existente);
      await manager.delete(CuadrillaMiembro, { cuadrilla_id: cuadrilla.id });
    } else {
      cuadrilla = await manager.save(
        Cuadrilla,
        manager.create(Cuadrilla, {
          nombre: datos.nombre!.trim(),
          especialidad_id: datos.especialidad_id ?? null,
          activa: true,
        }),
      );
    }

    await manager.save(
      CuadrillaMiembro,
      miembros.map((usuario_id) => ({
        cuadrilla_id: cuadrilla.id,
        usuario_id,
        es_responsable: usuario_id === datos.responsable_usuario_id,
      })),
    );
    return cuadrilla.id;
  }
}

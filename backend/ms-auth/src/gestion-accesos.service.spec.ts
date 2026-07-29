import { ForbiddenException } from '@nestjs/common';
import {
  Cuadrilla,
  CuadrillaMiembro,
  RefreshToken,
  Rol,
  ROLES,
  SolicitudTi,
  SolicitudTiUsuario,
  Usuario,
  UsuarioRol,
} from '@ojo-camba/common';
import { DataSource, EntityManager } from 'typeorm';
import { GestionAccesosService } from './gestion-accesos.service';

const roles = Object.values(ROLES).map((nombre, index) => ({ id: index + 1, nombre }));

function crearEntorno(rolesPorUsuario: Record<number, string[]>) {
  const rolesActuales = Object.fromEntries(
    Object.entries(rolesPorUsuario).map(([usuarioId, rolesUsuario]) => [
      usuarioId,
      [...rolesUsuario],
    ]),
  ) as Record<number, string[]>;
  const manager = {
    find: jest.fn((entidad: unknown, opciones?: { where?: { usuario_id?: number } }) => {
      if (entidad === Rol) return Promise.resolve(roles);
      if (entidad === UsuarioRol) {
        const usuarioId = opciones?.where?.usuario_id ?? 0;
        return Promise.resolve(
          (rolesActuales[usuarioId] ?? []).map((nombre) => ({
            usuario_id: usuarioId,
            rol: { nombre },
          })),
        );
      }
      return Promise.resolve([]);
    }),
    findOne: jest.fn((entidad: unknown, opciones: { where: { id: number } }) => {
      if (entidad === Usuario) {
        return Promise.resolve({ id: opciones.where.id, nombre: `Usuario ${opciones.where.id}` });
      }
      return Promise.resolve(null);
    }),
    create: jest.fn((_entidad: unknown, valor: object) => valor),
    save: jest.fn((entidad: unknown, valor: unknown) => {
      if (entidad === UsuarioRol) {
        for (const relacion of valor as Array<{ usuario_id: number; rol_id: number }>) {
          const rol = roles.find((item) => item.id === relacion.rol_id);
          if (rol) {
            rolesActuales[relacion.usuario_id] = [
              ...(rolesActuales[relacion.usuario_id] ?? []),
              rol.nombre,
            ];
          }
        }
      }
      if (entidad === SolicitudTi) return Promise.resolve({ ...(valor as object), id: 41 });
      if (entidad === Cuadrilla) return Promise.resolve({ ...(valor as object), id: 9 });
      return Promise.resolve(valor);
    }),
    delete: jest.fn((entidad: unknown, criterio: { usuario_id?: number }) => {
      if (entidad === UsuarioRol && criterio.usuario_id) rolesActuales[criterio.usuario_id] = [];
      return Promise.resolve({});
    }),
    update: jest.fn().mockResolvedValue({}),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn((callback: (transaction: EntityManager) => unknown) => callback(manager)),
  } as unknown as DataSource;
  const repo = { manager, findAndCount: jest.fn(), find: jest.fn() };
  const service = new GestionAccesosService(
    dataSource,
    repo as never,
    repo as never,
    repo as never,
    repo as never,
    repo as never,
  );
  return { service, manager, dataSource, rolesActuales };
}

describe('GestionAccesosService', () => {
  it('mantiene ciudadano, registra antes/después y revoca sesiones al retirar funciones', async () => {
    const { service, manager } = crearEntorno({
      1: [ROLES.CIUDADANO, ROLES.ENCARGADO_IT],
      2: [ROLES.CIUDADANO, ROLES.TECNICO],
    });

    const result = await service.aplicarSolicitud({
      tipo: 'baja',
      referencia_carta: 'CITE-TI-021/2026',
      cambios: [{ usuario_id: 2, roles: [] }],
      ejecutado_por_usuario_id: 1,
    });

    expect(result.id).toBe(41);
    expect(manager.save).toHaveBeenCalledWith(
      UsuarioRol,
      expect.arrayContaining([expect.objectContaining({ usuario_id: 2, rol_id: 1 })]),
    );
    expect(manager.update).toHaveBeenCalledWith(
      RefreshToken,
      { usuario_id: 2, revoked: false },
      { revoked: true },
    );
    expect(manager.save).toHaveBeenCalledWith(
      SolicitudTiUsuario,
      expect.arrayContaining([
        expect.objectContaining({
          usuario_id: 2,
          roles_antes: [ROLES.CIUDADANO, ROLES.TECNICO],
          roles_despues: [ROLES.CIUDADANO],
        }),
      ]),
    );
  });

  it('promueve técnicos y conforma una cuadrilla con un único responsable en la misma solicitud', async () => {
    const { service, manager } = crearEntorno({
      1: [ROLES.CIUDADANO, ROLES.ENCARGADO_IT],
      2: [ROLES.CIUDADANO],
      3: [ROLES.CIUDADANO, ROLES.TECNICO],
    });

    await service.aplicarSolicitud({
      tipo: 'conformacion_cuadrilla',
      referencia_carta: 'CITE-TI-022/2026',
      cambios: [{ usuario_id: 2, roles: [ROLES.TECNICO] }],
      cuadrilla: {
        nombre: 'Cuadrilla Norte',
        responsable_usuario_id: 2,
        miembro_usuario_ids: [2, 3],
      },
      ejecutado_por_usuario_id: 1,
    });

    expect(manager.save).toHaveBeenCalledWith(
      CuadrillaMiembro,
      expect.arrayContaining([
        expect.objectContaining({ cuadrilla_id: 9, usuario_id: 2, es_responsable: true }),
        expect.objectContaining({ cuadrilla_id: 9, usuario_id: 3, es_responsable: false }),
      ]),
    );
  });

  it('rechaza el flujo si el ejecutor no tiene el rol encargado_it', async () => {
    const { service } = crearEntorno({
      1: [ROLES.CIUDADANO, ROLES.BACKOFFICE],
      2: [ROLES.CIUDADANO],
    });

    await expect(
      service.aplicarSolicitud({
        tipo: 'alta',
        referencia_carta: 'CITE-TI-023/2026',
        cambios: [{ usuario_id: 2, roles: [ROLES.TECNICO] }],
        ejecutado_por_usuario_id: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('asigna más de una función operativa sin quitar ciudadanía', async () => {
    const { service, manager } = crearEntorno({
      1: [ROLES.CIUDADANO, ROLES.ENCARGADO_IT],
      2: [ROLES.CIUDADANO],
    });

    await service.aplicarSolicitud({
      tipo: 'alta',
      referencia_carta: 'CITE-TI-024/2026',
      cambios: [{ usuario_id: 2, roles: [ROLES.BACKOFFICE, ROLES.TECNICO] }],
      ejecutado_por_usuario_id: 1,
    });

    expect(manager.save).toHaveBeenCalledWith(
      UsuarioRol,
      expect.arrayContaining([
        expect.objectContaining({ usuario_id: 2, rol_id: 1 }),
        expect.objectContaining({ usuario_id: 2, rol_id: 2 }),
        expect.objectContaining({ usuario_id: 2, rol_id: 3 }),
      ]),
    );
  });

  it('recorre ciudadano → backoffice → técnico → responsable y configura TI + Backoffice', async () => {
    const { service, manager, rolesActuales } = crearEntorno({
      1: [ROLES.CIUDADANO, ROLES.ENCARGADO_IT],
      2: [ROLES.CIUDADANO],
      3: [ROLES.CIUDADANO],
    });

    await service.aplicarSolicitud({
      tipo: 'alta',
      referencia_carta: 'CITE-TI-025/2026',
      cambios: [{ usuario_id: 2, roles: [ROLES.BACKOFFICE] }],
      ejecutado_por_usuario_id: 1,
    });
    expect(rolesActuales[2]).toEqual([ROLES.CIUDADANO, ROLES.BACKOFFICE]);

    await service.aplicarSolicitud({
      tipo: 'cambio',
      referencia_carta: 'CITE-TI-026/2026',
      cambios: [{ usuario_id: 2, roles: [ROLES.BACKOFFICE, ROLES.TECNICO] }],
      ejecutado_por_usuario_id: 1,
    });
    expect(rolesActuales[2]).toEqual([ROLES.CIUDADANO, ROLES.BACKOFFICE, ROLES.TECNICO]);

    await service.aplicarSolicitud({
      tipo: 'conformacion_cuadrilla',
      referencia_carta: 'CITE-TI-027/2026',
      cambios: [{ usuario_id: 2, roles: [ROLES.BACKOFFICE, ROLES.TECNICO] }],
      cuadrilla: {
        nombre: 'Cuadrilla Centro',
        responsable_usuario_id: 2,
        miembro_usuario_ids: [2],
      },
      ejecutado_por_usuario_id: 1,
    });
    expect(manager.save).toHaveBeenCalledWith(CuadrillaMiembro, [
      expect.objectContaining({ usuario_id: 2, es_responsable: true }),
    ]);

    await service.aplicarSolicitud({
      tipo: 'alta',
      referencia_carta: 'CITE-TI-028/2026',
      cambios: [{ usuario_id: 3, roles: [ROLES.BACKOFFICE, ROLES.ENCARGADO_IT] }],
      ejecutado_por_usuario_id: 1,
    });
    expect(rolesActuales[3]).toEqual([ROLES.CIUDADANO, ROLES.BACKOFFICE, ROLES.ENCARGADO_IT]);
  });
});

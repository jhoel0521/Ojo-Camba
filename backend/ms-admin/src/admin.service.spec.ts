import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import {
  Reporte,
  Dispositivo,
  GrupoReporte,
  ActualizacionCaso,
  Categoria,
  EstadoReporte,
} from '@ojo-camba/common';
import { AdminService } from './admin.service';

function makeRepoMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(Array.isArray(x) ? x : { id: 1, ...x })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };
}

// QueryBuilder falso encadenable: cada metodo de encadenado se devuelve a si
// mismo; los metodos terminales (getRawMany/getCount) resuelven el valor dado.
function makeQb(rawMany: unknown[] = [], count = 0) {
  const qb: Record<string, jest.Mock> = {};
  const chain = [
    'select',
    'addSelect',
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'skip',
    'take',
  ];
  for (const m of chain) qb[m] = jest.fn(() => qb);
  qb.getRawMany = jest.fn().mockResolvedValue(rawMany);
  qb.getCount = jest.fn().mockResolvedValue(count);
  qb.getRawAndEntities = jest.fn().mockResolvedValue({ entities: [], raw: [] });
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

describe('AdminService', () => {
  let service: AdminService;
  let reporteRepo: ReturnType<typeof makeRepoMock>;
  let grupoRepo: ReturnType<typeof makeRepoMock>;
  let actualizacionRepo: ReturnType<typeof makeRepoMock>;
  let dispositivoRepo: ReturnType<typeof makeRepoMock>;
  let gamifyClient: { emit: jest.Mock };

  beforeEach(async () => {
    reporteRepo = makeRepoMock();
    grupoRepo = makeRepoMock();
    actualizacionRepo = makeRepoMock();
    dispositivoRepo = makeRepoMock();
    gamifyClient = { emit: jest.fn().mockReturnValue({ subscribe: jest.fn() }) };

    // acceptReport corre dentro de reporteRepo.manager.transaction(); el manager
    // fake enruta findOne/save/count/create al mock de Reporte o GrupoReporte segun
    // la entidad pasada, replicando el comportamiento real de EntityManager.
    const fakeManager = {
      findOne: jest.fn((entity: unknown, opts: unknown) =>
        entity === GrupoReporte ? grupoRepo.findOne(opts) : reporteRepo.findOne(opts),
      ),
      count: jest.fn((entity: unknown) =>
        entity === GrupoReporte ? grupoRepo.count() : reporteRepo.count(),
      ),
      create: jest.fn((entity: unknown, x: unknown) =>
        entity === GrupoReporte ? grupoRepo.create(x) : reporteRepo.create(x),
      ),
      save: jest.fn((x: Record<string, unknown>) =>
        x && 'codigo_obra' in x ? grupoRepo.save(x) : reporteRepo.save(x),
      ),
    };
    (reporteRepo as unknown as { manager: unknown }).manager = {
      transaction: jest.fn((cb: (m: typeof fakeManager) => unknown) => cb(fakeManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Reporte), useValue: reporteRepo },
        { provide: getRepositoryToken(Dispositivo), useValue: dispositivoRepo },
        { provide: getRepositoryToken(GrupoReporte), useValue: grupoRepo },
        { provide: getRepositoryToken(ActualizacionCaso), useValue: actualizacionRepo },
        { provide: getRepositoryToken(Categoria), useValue: makeRepoMock() },
        { provide: 'MS_GAMIFY', useValue: gamifyClient },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('codigo_obra', () => {
    it('acceptReport sin grupo_id genera codigo con formato O-YY-NNNNNNN', async () => {
      reporteRepo.findOne.mockResolvedValue({
        id: 1,
        estado: EstadoReporte.Reportado,
        usuario_id: null,
        categoria_id: 1,
      });
      grupoRepo.count.mockResolvedValue(0);

      const result = await service.acceptReport({ report_id: 1, moderador_id: 1 });

      const yy = String(new Date().getFullYear()).slice(-2);
      expect(result.codigo_obra).toBe(`O-${yy}-0000001`);
      expect(result.codigo_obra).toMatch(/^O-\d{2}-\d{7}$/);
    });

    it('createGroup genera el mismo formato O-YY-NNNNNNN', async () => {
      reporteRepo.find.mockResolvedValue([
        { id: 1, estado: EstadoReporte.Reportado },
        { id: 2, estado: EstadoReporte.Reportado },
      ]);
      grupoRepo.count.mockResolvedValue(4);

      const result = await service.createGroup({ report_ids: [1, 2], creado_por_usuario_id: 1 });

      const yy = String(new Date().getFullYear()).slice(-2);
      expect(result.codigo_obra).toBe(`O-${yy}-0000005`);
    });
  });

  describe('createGroup — agrupacion por proximidad, no por celda H3 estricta', () => {
    it('permite agrupar reportes aunque pertenezcan a hexagonos H3 distintos (decision de producto)', async () => {
      // Los dos reportes simulan celdas H3 distintas: el servicio no las compara,
      // solo valida existencia + estado "Reportado". El backoffice decide la cercania.
      reporteRepo.find.mockResolvedValue([
        { id: 1, estado: EstadoReporte.Reportado, h3_res_11: 'cellA' },
        { id: 2, estado: EstadoReporte.Reportado, h3_res_11: 'cellB' },
      ]);
      grupoRepo.count.mockResolvedValue(0);

      await expect(
        service.createGroup({ report_ids: [1, 2], creado_por_usuario_id: 1 }),
      ).resolves.toMatchObject({ reportes_agrupados: 2 });
    });

    it('rechaza con menos de 2 reportes', async () => {
      await expect(
        service.createGroup({ report_ids: [1], creado_por_usuario_id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si algun reporte no esta en estado Reportado', async () => {
      reporteRepo.find.mockResolvedValue([
        { id: 1, estado: EstadoReporte.Reportado },
        { id: 2, estado: EstadoReporte.Aceptado },
      ]);
      await expect(
        service.createGroup({ report_ids: [1, 2], creado_por_usuario_id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCase', () => {
    it('permite bitacora sin cambiar estado (HU-05)', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Aceptado });
      actualizacionRepo.create.mockReturnValue({
        id: 10,
        comentario: 'avance',
        estado_nuevo: null,
      });
      actualizacionRepo.save.mockResolvedValue({
        id: 10,
        comentario: 'avance',
        estado_nuevo: null,
        creado_en: new Date(),
      });

      const result = await service.updateCase({ grupo_id: 1, usuario_id: 2, comentario: 'avance' });

      expect(result.estado_nuevo).toBeNull();
      expect(grupoRepo.save).not.toHaveBeenCalled();
      expect(reporteRepo.update).not.toHaveBeenCalled();
    });

    it('cambia estado del grupo y cascada a sus reportes', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Aceptado });
      actualizacionRepo.create.mockReturnValue({ id: 11, estado_nuevo: EstadoReporte.EnTrabajo });
      actualizacionRepo.save.mockResolvedValue({
        id: 11,
        estado_nuevo: EstadoReporte.EnTrabajo,
        comentario: 'inicio',
        creado_en: new Date(),
      });

      await service.updateCase({
        grupo_id: 1,
        usuario_id: 2,
        comentario: 'inicio',
        estado_nuevo: EstadoReporte.EnTrabajo,
      });

      expect(grupoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: EstadoReporte.EnTrabajo }),
      );
      expect(reporteRepo.update).toHaveBeenCalledWith(
        { grupo_id: 1 },
        { estado: EstadoReporte.EnTrabajo },
      );
    });

    it('rechaza estado_nuevo invalido', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Aceptado });
      actualizacionRepo.create.mockReturnValue({});
      actualizacionRepo.save.mockResolvedValue({});

      await expect(
        service.updateCase({
          grupo_id: 1,
          usuario_id: 2,
          comentario: 'x',
          estado_nuevo: 'NoExiste',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptReport', () => {
    it('rechaza aceptar un reporte que no esta en estado Reportado', async () => {
      reporteRepo.findOne.mockResolvedValue({ id: 1, estado: EstadoReporte.Aceptado });
      await expect(service.acceptReport({ report_id: 1, moderador_id: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveRango (filtro de fechas del Dashboard, Sprint 3)', () => {
    it('sin desde ni hasta devuelve null (sin filtro, comportamiento historico)', () => {
      const rango = (
        service as unknown as { resolveRango: (d?: string, h?: string) => unknown }
      ).resolveRango(undefined, undefined);
      expect(rango).toBeNull();
    });

    it('con desde y hasta arma el rango en ISO con horas de inicio/fin de dia', () => {
      const rango = (
        service as unknown as {
          resolveRango: (d?: string, h?: string) => { desde: string; hasta: string };
        }
      ).resolveRango('2026-06-01', '2026-06-30');
      expect(rango.desde).toBe(new Date('2026-06-01T00:00:00.000').toISOString());
      expect(rango.hasta).toBe(new Date('2026-06-30T23:59:59.999').toISOString());
    });

    it('con solo "hasta" usa 2000-01-01 como limite inferior', () => {
      const rango = (
        service as unknown as { resolveRango: (d?: string, h?: string) => { desde: string } }
      ).resolveRango(undefined, '2026-06-30');
      expect(rango.desde).toBe(new Date('2000-01-01T00:00:00.000').toISOString());
    });
  });

  describe('getDashboardKpis', () => {
    it('sin rango, no aplica filtro de fecha en las agregaciones (comportamiento historico)', async () => {
      const reportesPorMesQb = makeQb([{ mes: '2026-06', total: '5' }]);
      const porCategoriaQb = makeQb([{ categoria_id: '1', nombre: 'bache', total: '3' }]);
      const casosPorEstadoQb = makeQb([{ estado: 'Finalizado', total: '2' }]);

      reporteRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0)) // aceptadosHoy (getDashboard)
        .mockImplementationOnce(() => reportesPorMesQb)
        .mockImplementationOnce(() => porCategoriaQb);
      grupoRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0)) // casosActivos (getDashboard)
        .mockImplementationOnce(() => casosPorEstadoQb);

      const result = await service.getDashboardKpis();

      expect(reportesPorMesQb.andWhere).not.toHaveBeenCalled();
      expect(reportesPorMesQb.where).toHaveBeenCalledWith(
        'r.creado_en >= :desde',
        expect.any(Object),
      );
      expect(porCategoriaQb.andWhere).not.toHaveBeenCalled();
      expect(casosPorEstadoQb.where).not.toHaveBeenCalled();
      expect(result.rango_aplicado).toBeNull();
      expect(result.tasa_resolucion).toBe(100);
    });

    it('con desde/hasta, aplica BETWEEN en las 3 agregaciones filtrables y devuelve rango_aplicado', async () => {
      const reportesPorMesQb = makeQb([{ mes: '2026-06', total: '5' }]);
      const porCategoriaQb = makeQb([{ categoria_id: '1', nombre: 'bache', total: '3' }]);
      const casosPorEstadoQb = makeQb([
        { estado: 'Finalizado', total: '1' },
        { estado: 'Aceptado', total: '1' },
      ]);

      reporteRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0))
        .mockImplementationOnce(() => reportesPorMesQb)
        .mockImplementationOnce(() => porCategoriaQb);
      grupoRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0))
        .mockImplementationOnce(() => casosPorEstadoQb);

      const result = await service.getDashboardKpis('2026-06-01', '2026-06-30');

      expect(reportesPorMesQb.where).toHaveBeenCalledWith(
        'r.creado_en BETWEEN :desde AND :hasta',
        expect.any(Object),
      );
      expect(porCategoriaQb.andWhere).toHaveBeenCalledWith(
        'r.creado_en BETWEEN :desde AND :hasta',
        expect.any(Object),
      );
      expect(casosPorEstadoQb.where).toHaveBeenCalledWith(
        'g.creado_en BETWEEN :desde AND :hasta',
        expect.any(Object),
      );
      expect(result.rango_aplicado).toEqual({ desde: '2026-06-01', hasta: '2026-06-30' });
      expect(result.tasa_resolucion).toBe(50);
    });
  });
});

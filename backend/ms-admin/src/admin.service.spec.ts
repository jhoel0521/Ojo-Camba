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
import { AdminService, type DashboardInsight } from './admin.service';

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
    query: jest.fn().mockResolvedValue([]),
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

    it('cambia estado del grupo y cascada a sus reportes (transicion legal Aceptado -> ValidacionEnCampo)', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Aceptado });
      actualizacionRepo.create.mockImplementation((x) => x);
      actualizacionRepo.save.mockImplementation((x) =>
        Promise.resolve({ id: 11, creado_en: new Date(), ...x }),
      );

      await service.updateCase({
        grupo_id: 1,
        usuario_id: 2,
        comentario: 'inicio',
        estado_nuevo: EstadoReporte.ValidacionEnCampo,
      });

      expect(grupoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: EstadoReporte.ValidacionEnCampo }),
      );
      expect(reporteRepo.update).toHaveBeenCalledWith(
        { grupo_id: 1 },
        { estado: EstadoReporte.ValidacionEnCampo },
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

  describe('updateCase — flujo secuencial obligatorio (trazabilidad)', () => {
    beforeEach(() => {
      actualizacionRepo.create.mockImplementation((x) => x);
      actualizacionRepo.save.mockImplementation((x) =>
        Promise.resolve({ id: 99, creado_en: new Date(), ...x }),
      );
    });

    const transicionesLegales: [EstadoReporte, EstadoReporte][] = [
      [EstadoReporte.Aceptado, EstadoReporte.ValidacionEnCampo],
      [EstadoReporte.ValidacionEnCampo, EstadoReporte.EnTrabajo],
      [EstadoReporte.EnTrabajo, EstadoReporte.Finalizado],
    ];

    it.each(transicionesLegales)('permite %s -> %s', async (desde, hasta) => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: desde });

      await expect(
        service.updateCase({ grupo_id: 1, usuario_id: 2, comentario: 'ok', estado_nuevo: hasta }),
      ).resolves.toBeDefined();
      expect(grupoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: hasta }),
      );
    });

    const transicionesIlegales: [EstadoReporte, EstadoReporte][] = [
      [EstadoReporte.Aceptado, EstadoReporte.EnTrabajo], // salto
      [EstadoReporte.Aceptado, EstadoReporte.Finalizado], // salto
      [EstadoReporte.EnTrabajo, EstadoReporte.Aceptado], // retroceso — el caso reportado por el usuario
      [EstadoReporte.EnTrabajo, EstadoReporte.ValidacionEnCampo], // retroceso
      [EstadoReporte.ValidacionEnCampo, EstadoReporte.Aceptado], // retroceso
      [EstadoReporte.Aceptado, EstadoReporte.Rechazado], // Rechazado no aplica a un Caso ya agrupado
    ];

    it.each(transicionesIlegales)('rechaza %s -> %s con mensaje claro', async (desde, hasta) => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: desde });

      await expect(
        service.updateCase({ grupo_id: 1, usuario_id: 2, comentario: 'x', estado_nuevo: hasta }),
      ).rejects.toThrow(BadRequestException);
      expect(grupoRepo.save).not.toHaveBeenCalled();
    });

    it('Finalizado es terminal: cualquier estado_nuevo posterior se rechaza', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Finalizado });

      await expect(
        service.updateCase({
          grupo_id: 1,
          usuario_id: 2,
          comentario: 'x',
          estado_nuevo: EstadoReporte.EnTrabajo,
        }),
      ).rejects.toThrow(/estado terminal/i);
    });

    it('persiste estado_anterior en la bitacora al cambiar de estado', async () => {
      grupoRepo.findOne.mockResolvedValue({
        id: 1,
        estado_actual: EstadoReporte.ValidacionEnCampo,
      });

      await service.updateCase({
        grupo_id: 1,
        usuario_id: 2,
        comentario: 'avanza',
        estado_nuevo: EstadoReporte.EnTrabajo,
      });

      expect(actualizacionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          estado_anterior: EstadoReporte.ValidacionEnCampo,
          estado_nuevo: EstadoReporte.EnTrabajo,
        }),
      );
    });

    it('estado_anterior queda null cuando no hay cambio de estado', async () => {
      grupoRepo.findOne.mockResolvedValue({ id: 1, estado_actual: EstadoReporte.Aceptado });

      await service.updateCase({ grupo_id: 1, usuario_id: 2, comentario: 'solo avance' });

      expect(actualizacionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado_anterior: null, estado_nuevo: null }),
      );
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

  describe('buildInsights (Dashboard DSS — Knowledge-driven, Sprint final)', () => {
    type Kpis = {
      pendientes: number;
      dispositivos_baneados: number;
      tasa_resolucion: number;
      por_categoria: { categoria_id: number; nombre: string; total: number }[];
    };

    function build(kpis: Kpis): DashboardInsight[] {
      return (
        service as unknown as { buildInsights: (k: Kpis) => DashboardInsight[] }
      ).buildInsights(kpis);
    }

    const sano: Kpis = {
      pendientes: 3,
      dispositivos_baneados: 1,
      tasa_resolucion: 90,
      por_categoria: [
        { categoria_id: 1, nombre: 'Bache', total: 3 },
        { categoria_id: 2, nombre: 'Alumbrado', total: 3 },
        { categoria_id: 3, nombre: 'Residuos', total: 3 },
      ],
    };

    it('tasa de resolucion bajo 70% genera alerta con link a casos en trabajo', () => {
      const insights = build({ ...sano, tasa_resolucion: 65 });
      const alerta = insights.find((i) => i.kpi === 'tasa_resolucion');
      expect(alerta?.nivel).toBe('alerta');
      expect(alerta?.link).toBe('/casos?estado=EnTrabajo');
    });

    it('tasa de resolucion en 70% o mas no genera alerta', () => {
      const insights = build({ ...sano, tasa_resolucion: 70 });
      expect(insights.find((i) => i.kpi === 'tasa_resolucion')).toBeUndefined();
    });

    it('backlog de pendientes mayor a 10 genera alerta con link a revisar', () => {
      const insights = build({ ...sano, pendientes: 11 });
      const alerta = insights.find((i) => i.kpi === 'pendientes');
      expect(alerta?.nivel).toBe('alerta');
      expect(alerta?.link).toBe('/revisar');
    });

    it('categoria dominante (>40% del total) genera atencion mencionando su nombre', () => {
      const insights = build({
        ...sano,
        por_categoria: [
          { categoria_id: 1, nombre: 'Bache', total: 9 },
          { categoria_id: 2, nombre: 'Alumbrado', total: 1 },
        ],
      });
      const atencion = insights.find((i) => i.kpi === 'por_categoria');
      expect(atencion?.nivel).toBe('atencion');
      expect(atencion?.mensaje).toContain('Bache');
    });

    it('mas de 5 dispositivos baneados genera atencion con link a usuarios', () => {
      const insights = build({ ...sano, dispositivos_baneados: 6 });
      const atencion = insights.find((i) => i.kpi === 'dispositivos_baneados');
      expect(atencion?.nivel).toBe('atencion');
      expect(atencion?.link).toBe('/usuarios');
    });

    it('sin ninguna regla activada, devuelve exactamente un insight positivo', () => {
      const insights = build(sano);
      expect(insights).toHaveLength(1);
      expect(insights[0].nivel).toBe('positivo');
    });

    it('nunca devuelve mas de 4 insights, ordenados por severidad', () => {
      const insights = build({
        pendientes: 20,
        dispositivos_baneados: 20,
        tasa_resolucion: 10,
        por_categoria: [
          { categoria_id: 1, nombre: 'Bache', total: 9 },
          { categoria_id: 2, nombre: 'Alumbrado', total: 1 },
        ],
      });
      expect(insights.length).toBeLessThanOrEqual(4);
      const niveles = insights.map((i) => i.nivel);
      const primerAtencion = niveles.indexOf('atencion');
      const ultimaAlerta = niveles.lastIndexOf('alerta');
      if (primerAtencion !== -1 && ultimaAlerta !== -1) {
        expect(ultimaAlerta).toBeLessThan(primerAtencion);
      }
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
      expect(result.insights.length).toBeGreaterThan(0);
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

  describe('getCasosPorEstadoHistorico (evolucion del pipeline, Dashboard DSS)', () => {
    it('transforma filas crudas de la consulta SQL en series por dia y estado', async () => {
      grupoRepo.query.mockResolvedValue([
        { dia: '2026-06-01', estado: 'Aceptado', total: '5' },
        { dia: '2026-06-01', estado: 'Finalizado', total: '10' },
        { dia: '2026-06-02', estado: 'Aceptado', total: '4' },
      ]);

      const historico = await (
        service as unknown as {
          getCasosPorEstadoHistorico: (
            d?: string,
            h?: string,
          ) => Promise<{ dia: string; estado: string; total: number }[]>;
        }
      ).getCasosPorEstadoHistorico('2026-06-01', '2026-06-02');

      expect(historico).toEqual([
        { dia: '2026-06-01', estado: 'Aceptado', total: 5 },
        { dia: '2026-06-01', estado: 'Finalizado', total: 10 },
        { dia: '2026-06-02', estado: 'Aceptado', total: 4 },
      ]);
    });

    it('pasa el rango desde/hasta como parametros de la consulta SQL', async () => {
      await (
        service as unknown as {
          getCasosPorEstadoHistorico: (d?: string, h?: string) => Promise<unknown>;
        }
      ).getCasosPorEstadoHistorico('2026-06-01', '2026-06-05');

      expect(grupoRepo.query).toHaveBeenCalledWith(expect.any(String), [
        '2026-06-01',
        '2026-06-05',
      ]);
    });

    it('sin rango, usa los ultimos 30 dias por defecto', async () => {
      await (
        service as unknown as {
          getCasosPorEstadoHistorico: (d?: string, h?: string) => Promise<unknown>;
        }
      ).getCasosPorEstadoHistorico();

      const [, params] = grupoRepo.query.mock.calls[0] as [string, [string, string]];
      const [desde, hasta] = params;
      const dias = Math.round(
        (new Date(hasta).getTime() - new Date(desde).getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(dias).toBe(29);
    });

    it('getDashboardKpis incluye casos_por_estado_historico en la respuesta', async () => {
      reporteRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0)) // aceptadosHoy (getDashboard)
        .mockImplementationOnce(() => makeQb([], 0)) // reportesPorMes
        .mockImplementationOnce(() => makeQb([], 0)); // porCategoria
      grupoRepo.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => makeQb([], 0)) // casosActivos (getDashboard)
        .mockImplementationOnce(() => makeQb([], 0)); // casosPorEstado
      grupoRepo.query.mockResolvedValue([{ dia: '2026-07-01', estado: 'Aceptado', total: '1' }]);

      const result = await service.getDashboardKpis();

      expect(result.casos_por_estado_historico).toEqual([
        { dia: '2026-07-01', estado: 'Aceptado', total: 1 },
      ]);
    });
  });
});

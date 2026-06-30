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
    count: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(Array.isArray(x) ? x : { id: 1, ...x })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };
}

describe('AdminService', () => {
  let service: AdminService;
  let reporteRepo: ReturnType<typeof makeRepoMock>;
  let grupoRepo: ReturnType<typeof makeRepoMock>;
  let actualizacionRepo: ReturnType<typeof makeRepoMock>;
  let gamifyClient: { emit: jest.Mock };

  beforeEach(async () => {
    reporteRepo = makeRepoMock();
    grupoRepo = makeRepoMock();
    actualizacionRepo = makeRepoMock();
    gamifyClient = { emit: jest.fn().mockReturnValue({ subscribe: jest.fn() }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Reporte), useValue: reporteRepo },
        { provide: getRepositoryToken(Dispositivo), useValue: makeRepoMock() },
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
});

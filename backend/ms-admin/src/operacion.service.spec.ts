import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConfiguracionOperativa,
  CuadrillaMiembro,
  DerivacionCaso,
  ActualizacionCaso,
  GrupoReporte,
  Reporte,
  UsuarioRol,
} from '@ojo-camba/common';
import { OperacionService, UMBRALES_OPERATIVOS } from './operacion.service';

function repoMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 1, ...value })),
    update: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
  };
}

describe('OperacionService', () => {
  let service: OperacionService;
  let configRepo: ReturnType<typeof repoMock>;
  let reporteRepo: ReturnType<typeof repoMock>;
  let derivacionRepo: ReturnType<typeof repoMock>;
  let miembroRepo: ReturnType<typeof repoMock>;
  let actualizacionRepo: ReturnType<typeof repoMock>;
  let usuarioRolRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    configRepo = repoMock();
    reporteRepo = repoMock();
    derivacionRepo = repoMock();
    miembroRepo = repoMock();
    actualizacionRepo = repoMock();
    usuarioRolRepo = repoMock();
    const grupoRepo = repoMock();
    const modulo = await Test.createTestingModule({
      providers: [
        OperacionService,
        { provide: getRepositoryToken(CuadrillaMiembro), useValue: miembroRepo },
        { provide: getRepositoryToken(ConfiguracionOperativa), useValue: configRepo },
        { provide: getRepositoryToken(DerivacionCaso), useValue: derivacionRepo },
        { provide: getRepositoryToken(GrupoReporte), useValue: grupoRepo },
        { provide: getRepositoryToken(Reporte), useValue: reporteRepo },
        { provide: getRepositoryToken(ActualizacionCaso), useValue: actualizacionRepo },
        { provide: getRepositoryToken(UsuarioRol), useValue: usuarioRolRepo },
      ],
    }).compile();
    service = modulo.get(OperacionService);
  });

  it('alerta desde 8 y bloquea la asignación que superaría 10 reportes abiertos', async () => {
    configRepo.find.mockResolvedValue([
      { clave: UMBRALES_OPERATIVOS.CARGA_ALERTA, valor: 8 },
      { clave: UMBRALES_OPERATIVOS.CARGA_MAXIMA, valor: 10 },
    ]);
    const qb: Record<string, jest.Mock> = {};
    for (const method of ['innerJoin', 'where', 'andWhere']) qb[method] = jest.fn(() => qb);
    qb.getCount = jest.fn().mockResolvedValue(8);
    reporteRepo.createQueryBuilder.mockReturnValue(qb);
    reporteRepo.count.mockResolvedValue(3);

    await expect(service.validarCapacidad(4, 19)).resolves.toEqual(
      expect.objectContaining({
        reportes_abiertos: 8,
        reportes_entrantes: 3,
        proyeccion: 11,
        alerta_preventiva: true,
        admite_asignacion: false,
      }),
    );
  });

  it('persiste una derivación con evidencia y el técnico responsable autenticado', async () => {
    jest.spyOn(service, 'verificarAsignacionTecnica').mockResolvedValue({
      grupo: { id: 7 } as GrupoReporte,
      miembro: { es_responsable: true } as CuadrillaMiembro,
    });

    await service.registrarDerivacion({
      grupo_id: 7,
      entidad_destino: 'CRE',
      motivo: 'Cable de media tensión expuesto',
      evidencia_url: 'actualizaciones/evidencia.jpg',
      usuario_id: 3,
    });

    expect(derivacionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        grupo_id: 7,
        entidad_destino: 'CRE',
        confirmado_por_usuario_id: 3,
      }),
    );
  });

  it('no expone trabajos a un técnico sin membresía de cuadrilla', async () => {
    miembroRepo.find.mockResolvedValue([]);
    await expect(service.gruposDelTecnico(99)).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('no permite agregar a una cuadrilla a una persona sin el rol tecnico', async () => {
    usuarioRolRepo.find.mockResolvedValue([{ rol: { nombre: 'ciudadano' } }]);

    await expect(service.asignarMiembro(1, 9)).rejects.toThrow('debe tener el rol tecnico');
  });
});

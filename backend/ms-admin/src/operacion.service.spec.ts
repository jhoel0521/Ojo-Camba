import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConfiguracionOperativa,
  CuadrillaMiembro,
  DerivacionCaso,
  ActualizacionCaso,
  EstadoCaso,
  GrupoReporte,
  PropuestaVisita,
  Reporte,
  UsuarioRol,
  VisitaCaso,
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
  let visitaRepo: ReturnType<typeof repoMock>;
  let grupoRepo: ReturnType<typeof repoMock>;
  let propuestaRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    configRepo = repoMock();
    reporteRepo = repoMock();
    derivacionRepo = repoMock();
    miembroRepo = repoMock();
    actualizacionRepo = repoMock();
    usuarioRolRepo = repoMock();
    visitaRepo = repoMock();
    grupoRepo = repoMock();
    propuestaRepo = repoMock();
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
        { provide: getRepositoryToken(VisitaCaso), useValue: visitaRepo },
        { provide: getRepositoryToken(PropuestaVisita), useValue: propuestaRepo },
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

  it('Mis obras solo devuelve visitas abiertas asignadas al técnico solicitado', async () => {
    visitaRepo.findAndCount.mockResolvedValue([
      [{ id: 8, grupo_id: 14, tecnico_id: 9, fecha_planificada: '2026-08-01' }],
      1,
    ]);
    grupoRepo.find.mockResolvedValue([{ id: 14, codigo_obra: 'O-26-0000014' }]);

    const resultado = await service.visitasDelTecnico(9, 1, 20);

    expect(visitaRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tecnico_id: 9 }),
      }),
    );
    expect(resultado.data).toEqual([
      expect.objectContaining({ caso: expect.objectContaining({ codigo_obra: 'O-26-0000014' }) }),
    ]);
  });

  it('no permite agregar a una cuadrilla a una persona sin el rol tecnico', async () => {
    usuarioRolRepo.find.mockResolvedValue([{ rol: { nombre: 'ciudadano' } }]);

    await expect(service.asignarMiembro(1, 9)).rejects.toThrow('debe tener el rol tecnico');
  });

  it('el responsable asigna una visita a un técnico de su propia cuadrilla y queda trazabilidad', async () => {
    visitaRepo.findOne.mockResolvedValue({
      id: 8,
      grupo_id: 14,
      cuadrilla_id: 3,
      cerrada_en: null,
    });
    miembroRepo.findOne
      .mockResolvedValueOnce({ cuadrilla_id: 3, usuario_id: 4, es_responsable: true })
      .mockResolvedValueOnce({ cuadrilla_id: 3, usuario_id: 9, es_responsable: false });

    await service.asignarVisitaTecnico({
      visita_id: 8,
      responsable_id: 4,
      tecnico_id: 9,
      fecha_planificada: '2026-08-01',
      orden_ruta: 2,
    });

    expect(visitaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ tecnico_id: 9, orden_ruta: 2 }),
    );
    expect(actualizacionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ grupo_id: 14, usuario_id: 4 }),
    );
  });

  it('impide que el responsable distribuya una visita de otra cuadrilla', async () => {
    visitaRepo.findOne.mockResolvedValue({
      id: 8,
      grupo_id: 14,
      cuadrilla_id: 3,
      cerrada_en: null,
    });
    miembroRepo.findOne.mockResolvedValue(null);

    await expect(
      service.asignarVisitaTecnico({
        visita_id: 8,
        responsable_id: 4,
        tecnico_id: 9,
        fecha_planificada: '2026-08-01',
        orden_ruta: 1,
      }),
    ).rejects.toThrow('Solo el responsable de esta cuadrilla');
  });

  it('solo permite registrar llegada al técnico asignado a la visita', async () => {
    visitaRepo.findOne.mockResolvedValue({
      id: 8,
      grupo_id: 14,
      cuadrilla_id: 3,
      tecnico_id: 9,
      cerrada_en: null,
    });

    await expect(
      service.registrarLlegada({ visita_id: 8, tecnico_id: 10, lat: -17.78, lng: -63.18 }),
    ).rejects.toThrow('Solo el técnico asignado');
  });

  it('devuelve la obra con la agrupación completa de reportes al técnico asignado', async () => {
    visitaRepo.findOne.mockResolvedValue({ id: 8, grupo_id: 14, cuadrilla_id: 3, tecnico_id: 9 });
    grupoRepo.findOne.mockResolvedValue({ id: 14, codigo_obra: 'O-26-0000014' });
    reporteRepo.find.mockResolvedValue([{ id: 101 }, { id: 102 }, { id: 103 }]);

    await expect(service.detalleVisitaParaTecnico(8, 9)).resolves.toEqual(
      expect.objectContaining({
        visita: expect.objectContaining({ id: 8 }),
        caso: expect.objectContaining({ codigo_obra: 'O-26-0000014' }),
        agrupacion: expect.objectContaining({ total_reportes: 3 }),
      }),
    );
  });

  it('el técnico asignado propone finalización con evidencia, sin cerrar el Caso por sí mismo', async () => {
    visitaRepo.findOne.mockResolvedValue({ id: 8, grupo_id: 14, tecnico_id: 9, cerrada_en: null });
    propuestaRepo.save.mockImplementation((value) => Promise.resolve({ id: 25, ...value }));

    const propuesta = await service.proponerResultadoVisita({
      visita_id: 8,
      tecnico_id: 9,
      estado_propuesto: EstadoCaso.Finalizado,
      comentario: 'Se repuso la tapa y se aseguró el perímetro.',
      evidencia_url: 'actualizaciones/final.jpg',
    });

    expect(propuesta).toEqual(expect.objectContaining({ decision: 'Pendiente' }));
    expect(grupoRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza una propuesta terminal sin evidencia', async () => {
    visitaRepo.findOne.mockResolvedValue({ id: 8, grupo_id: 14, tecnico_id: 9, cerrada_en: null });

    await expect(
      service.proponerResultadoVisita({
        visita_id: 8,
        tecnico_id: 9,
        estado_propuesto: EstadoCaso.Finalizado,
        comentario: 'Trabajo realizado.',
      }),
    ).rejects.toThrow('requiere evidencia');
  });

  it('aplica EnTrabajo como resultado no terminal sin enviarlo a confirmación', async () => {
    visitaRepo.findOne.mockResolvedValue({ id: 8, grupo_id: 14, tecnico_id: 9, cerrada_en: null });
    grupoRepo.findOne.mockResolvedValue({ id: 14, estado_actual: EstadoCaso.ValidacionCampo });

    await expect(
      service.proponerResultadoVisita({
        visita_id: 8,
        tecnico_id: 9,
        estado_propuesto: EstadoCaso.EnTrabajo,
        comentario: 'Se requiere material para completar el bacheo.',
      }),
    ).resolves.toEqual({ requiere_confirmacion: false, estado_actual: EstadoCaso.EnTrabajo });
    expect(propuestaRepo.save).not.toHaveBeenCalled();
    expect(grupoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado_actual: EstadoCaso.EnTrabajo }),
    );
  });

  it('el responsable ve solamente visitas abiertas de su propia cuadrilla', async () => {
    miembroRepo.find.mockResolvedValue([{ cuadrilla_id: 3, usuario_id: 4, es_responsable: true }]);
    visitaRepo.findAndCount.mockResolvedValue([
      [{ id: 8, grupo_id: 14, cuadrilla_id: 3, tecnico_id: null, cerrada_en: null }],
      1,
    ]);
    grupoRepo.find.mockResolvedValue([{ id: 14, codigo_obra: 'O-26-0000014' }]);

    await expect(service.visitasDeCuadrillaResponsable(4)).resolves.toEqual(
      expect.objectContaining({
        total: 1,
        data: [expect.objectContaining({ caso: expect.objectContaining({ id: 14 }) })],
      }),
    );
  });
});

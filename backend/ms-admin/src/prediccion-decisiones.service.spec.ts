import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccionRecomendacion, DecisionRecomendacion, GrupoReporte } from '@ojo-camba/common';
import { PrediccionDecisionesService } from './prediccion-decisiones.service';

/**
 * Auditoría de las decisiones sobre recomendaciones (ISSUE-32).
 *
 * Lo que se prueba acá es lo que hace auditable al panel: que no se pueda
 * decidir sin motivo, que la precisión retrospectiva compare contra lo que de
 * verdad pasó, y que una semana en curso no se lea como un pronóstico fallado.
 */

const RECOMENDACION = {
  zona_h3: '8928308280fffff',
  categoria_id: 2,
  nivel: 'apoyo',
  accion: AccionRecomendacion.Aceptada,
  motivo: 'Se pide apoyo a la cuadrilla 3 por la lluvia prevista.',
  decidido_por_usuario_id: 7,
  recomendacion_original: 'Solicitar apoyo para la zona 8928308280fffff',
  riesgo: 1.2,
  casos_estimados: 8,
  periodo_desde: '2026-07-06',
  periodo_hasta: '2026-07-12',
};

function decisionGuardada(extra: Partial<DecisionRecomendacion> = {}) {
  return {
    id: 1,
    ...RECOMENDACION,
    factores: [],
    reportes_estimados: null,
    confianza: null,
    version_modelo: 'v1',
    version_dataset: 'd1',
    creado_en: new Date('2026-07-06T10:00:00Z'),
    ...extra,
  } as unknown as DecisionRecomendacion;
}

describe('PrediccionDecisionesService', () => {
  let service: PrediccionDecisionesService;
  let decisionRepo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let grupoRepo: { query: jest.Mock };
  let queryBuilder: {
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    andWhere: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    decisionRepo = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve({ id: 1, ...value })),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    grupoRepo = { query: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PrediccionDecisionesService,
        { provide: getRepositoryToken(DecisionRecomendacion), useValue: decisionRepo },
        { provide: getRepositoryToken(GrupoReporte), useValue: grupoRepo },
      ],
    }).compile();

    service = moduleRef.get(PrediccionDecisionesService);
  });

  describe('registrar una decisión', () => {
    it('guarda la copia de la recomendación junto con el motivo y el autor', async () => {
      await service.registrarDecision(RECOMENDACION);

      expect(decisionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          zona_h3: RECOMENDACION.zona_h3,
          accion: AccionRecomendacion.Aceptada,
          motivo: RECOMENDACION.motivo,
          recomendacion_original: RECOMENDACION.recomendacion_original,
          decidido_por_usuario_id: 7,
        }),
      );
    });

    it('rechaza decidir sin justificar', async () => {
      await expect(
        service.registrarDecision({ ...RECOMENDACION, motivo: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un motivo demasiado corto para explicar nada', async () => {
      await expect(
        service.registrarDecision({ ...RECOMENDACION, motivo: 'ok' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una acción que no está en el catálogo', async () => {
      await expect(
        service.registrarDecision({
          ...RECOMENDACION,
          accion: 'Ignorada' as AccionRecomendacion,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('exige el período pronosticado, que es lo que permite medir el acierto', async () => {
      await expect(
        service.registrarDecision({ ...RECOMENDACION, periodo_desde: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('descartar también exige motivo, no sólo aceptar', async () => {
      await expect(
        service.registrarDecision({
          ...RECOMENDACION,
          accion: AccionRecomendacion.Descartada,
          motivo: '',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('precisión retrospectiva', () => {
    it('compara el pronóstico contra los Casos observados de esa zona y semana', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[decisionGuardada()], 1]);
      // 5 Casos ocurrieron de verdad; se habían estimado 8.
      grupoRepo.query.mockResolvedValue([
        { zona_h3: RECOMENDACION.zona_h3, semana: '2026-07-06', casos: 5 },
      ]);

      const { data } = await service.listarDecisiones();

      expect(data[0].precision).toEqual({
        estado: 'medida',
        observado: 5,
        error: -3,
        error_absoluto: 3,
      });
    });

    it('cuenta cero cuando la semana cerró sin ningún Caso', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[decisionGuardada()], 1]);
      grupoRepo.query.mockResolvedValue([]);

      const { data } = await service.listarDecisiones();

      expect(data[0].precision).toMatchObject({ estado: 'medida', observado: 0, error: -8 });
    });

    it('no evalúa una semana que todavía no terminó', async () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 7);
      queryBuilder.getManyAndCount.mockResolvedValue([
        [
          decisionGuardada({
            periodo_desde: new Date().toISOString().slice(0, 10),
            periodo_hasta: futuro.toISOString().slice(0, 10),
          }),
        ],
        1,
      ]);

      const { data } = await service.listarDecisiones();

      // Informar "0 observados" leería como un pronóstico fallado.
      expect(data[0].precision).toMatchObject({
        estado: 'pendiente',
        observado: null,
        error: null,
      });
    });

    it('no consulta la operación cuando no hay decisiones que evaluar', async () => {
      const { data, total } = await service.listarDecisiones();

      expect(data).toEqual([]);
      expect(total).toBe(0);
      expect(grupoRepo.query).not.toHaveBeenCalled();
    });

    it('filtra por zona y por acción', async () => {
      await service.listarDecisiones({ zona: 'zona-a', accion: AccionRecomendacion.Descartada });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('d.zona_h3 = :zona', { zona: 'zona-a' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('d.accion = :accion', {
        accion: AccionRecomendacion.Descartada,
      });
    });

    it('acota el tamaño de página para no traerse el historial entero', async () => {
      await service.listarDecisiones({ limit: 5000 });

      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });
  });

  describe('Casos observados por zona', () => {
    it('marca el resultado como observación, nunca como estimación', async () => {
      grupoRepo.query.mockResolvedValue([
        { zona_h3: 'zona-a', categoria_id: 1, casos: 4 },
        { zona_h3: 'zona-b', categoria_id: 2, casos: 1 },
      ]);

      const resultado = await service.casosPorZona({ desde: '2026-07-06', hasta: '2026-07-12' });

      expect(resultado.origen).toBe('observacion');
      expect(resultado.total_casos).toBe(5);
      expect(resultado.detalle).toHaveLength(2);
    });

    it('agrega los filtros opcionales sin romper el orden de los parámetros', async () => {
      await service.casosPorZona({
        desde: '2026-07-06',
        hasta: '2026-07-12',
        categoria_id: 3,
        estado: 'EnTrabajo',
      });

      const [, parametros] = grupoRepo.query.mock.calls[0];
      expect(parametros).toEqual(['2026-07-06', '2026-07-12', 3, 'EnTrabajo']);
    });

    it('rechaza un período mal formado', async () => {
      await expect(
        service.casosPorZona({ desde: '06-07-2026', hasta: '2026-07-12' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un período que termina antes de empezar', async () => {
      await expect(
        service.casosPorZona({ desde: '2026-07-12', hasta: '2026-07-06' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deriva la zona del primer reporte agrupado, igual que el dataset del modelo', async () => {
      await service.casosPorZona({ desde: '2026-07-06', hasta: '2026-07-12' });

      const [sql] = grupoRepo.query.mock.calls[0];
      // Si esta definición se separa de dataset.py, la comparativa compara
      // cosas distintas sin avisar.
      expect(sql).toContain('ORDER BY r.id');
      expect(sql).toContain('h3_res_8');
    });
  });
});

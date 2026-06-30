import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { Nivel, HistorialPuntos } from '@ojo-camba/common';
import { GamifyService } from './gamify.service';

interface NivelRow {
  id: number;
  nombre: string;
  puntos_requeridos: number;
}

interface NivelQueryBuilder {
  where: (cond: string, p: { puntos: number }) => NivelQueryBuilder;
  orderBy: (field: string, dir: 'ASC' | 'DESC') => NivelQueryBuilder;
  getOne: () => Promise<NivelRow | null>;
}

function makeNivelQueryBuilder(niveles: NivelRow[]): NivelQueryBuilder {
  let mode: 'lte' | 'gt' | null = null;
  let params: { puntos: number } = { puntos: 0 };
  let order: 'ASC' | 'DESC' = 'ASC';

  const qb: NivelQueryBuilder = {
    where: jest.fn((cond: string, p: { puntos: number }) => {
      mode = cond.includes('<=') ? 'lte' : 'gt';
      params = p;
      return qb;
    }),
    orderBy: jest.fn((_field: string, dir: 'ASC' | 'DESC') => {
      order = dir;
      return qb;
    }),
    getOne: jest.fn(async () => {
      let filtered =
        mode === 'lte'
          ? niveles.filter((n) => n.puntos_requeridos <= params.puntos)
          : niveles.filter((n) => n.puntos_requeridos > params.puntos);
      filtered = [...filtered].sort((a, b) =>
        order === 'DESC'
          ? b.puntos_requeridos - a.puntos_requeridos
          : a.puntos_requeridos - b.puntos_requeridos,
      );
      return filtered[0] ?? null;
    }),
  };
  return qb;
}

const NIVELES: NivelRow[] = [
  { id: 1, nombre: 'Bronce', puntos_requeridos: 0 },
  { id: 2, nombre: 'Plata', puntos_requeridos: 50 },
  { id: 3, nombre: 'Oro', puntos_requeridos: 200 },
];

describe('GamifyService', () => {
  let service: GamifyService;
  let nivelRepo: { createQueryBuilder: jest.Mock; find: jest.Mock };
  let historialRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let authClient: { send: jest.Mock };

  beforeEach(async () => {
    nivelRepo = {
      createQueryBuilder: jest.fn(() => makeNivelQueryBuilder(NIVELES)),
      find: jest.fn().mockResolvedValue(NIVELES),
    };
    historialRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
    };
    authClient = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamifyService,
        { provide: getRepositoryToken(Nivel), useValue: nivelRepo },
        { provide: getRepositoryToken(HistorialPuntos), useValue: historialRepo },
        { provide: 'MS_AUTH', useValue: authClient },
      ],
    }).compile();

    service = module.get(GamifyService);
  });

  describe('resolveNivel', () => {
    it.each([
      [0, 'Bronce'],
      [49, 'Bronce'],
      [50, 'Plata'],
      [199, 'Plata'],
      [200, 'Oro'],
      [9999, 'Oro'],
    ])('con %i puntos resuelve nivel %s', async (puntos, esperado) => {
      const nivel = await (
        service as unknown as { resolveNivel: (p: number) => Promise<NivelRow> }
      ).resolveNivel(puntos);
      expect(nivel.nombre).toBe(esperado);
    });
  });

  describe('awardPoints', () => {
    it('es idempotente: un report_id que ya otorgo puntos no vuelve a sumar', async () => {
      historialRepo.findOne.mockResolvedValue({ id: 5, report_id: 42, usuario_id: 1, puntos: 10 });
      authClient.send.mockReturnValue(of({ puntos: 10, nivel_id: 1 }));

      const result = await service.awardPoints({ user_id: 1, report_id: 42 });

      expect(result.ya_otorgado).toBe(true);
      expect(historialRepo.save).not.toHaveBeenCalled();
    });

    it('suma puntos y sube de nivel al cruzar el umbral', async () => {
      authClient.send.mockImplementation((pattern: string, payload: Record<string, unknown>) => {
        if (typeof pattern === 'string' && pattern.includes('add_points')) {
          return of({ user_id: payload.user_id, puntos: 50, nivel_id: 1 });
        }
        return of({ user_id: payload.user_id, nivel_id: 2 });
      });

      const result = await service.awardPoints({ user_id: 1, puntos: 50, report_id: 7 });

      expect(historialRepo.save).toHaveBeenCalled();
      expect(result.subio_de_nivel).toBe(true);
      expect(result.nivel?.nombre).toBe('Plata');
    });

    it('no marca subida de nivel si se mantiene en el mismo rango', async () => {
      authClient.send.mockImplementation((pattern: string, payload: Record<string, unknown>) =>
        of({ user_id: payload.user_id, puntos: 5, nivel_id: 1 }),
      );

      const result = await service.awardPoints({ user_id: 1, puntos: 5 });

      expect(result.subio_de_nivel).toBe(false);
      expect(result.nivel?.nombre).toBe('Bronce');
    });
  });

  describe('getUserStats', () => {
    it('usuario inexistente (sin puntos en el perfil) cae a 0 puntos / nivel base', async () => {
      authClient.send.mockReturnValue(of({}));

      const stats = await service.getUserStats(999);

      expect(stats.puntos).toBe(0);
      expect(stats.nivel?.nombre).toBe('Bronce');
      expect(stats.progreso.porcentaje).toBe(0);
    });

    it('calcula el progreso hacia el siguiente nivel', async () => {
      authClient.send.mockReturnValue(of({ puntos: 25 }));

      const stats = await service.getUserStats(1);

      // Bronce(0) -> Plata(50): 25 puntos de un rango de 50 = 50%
      expect(stats.progreso.puntos_siguiente_nivel).toBe(50);
      expect(stats.progreso.porcentaje).toBe(50);
    });

    it('en el nivel maximo reporta progreso al 100%', async () => {
      authClient.send.mockReturnValue(of({ puntos: 500 }));

      const stats = await service.getUserStats(1);

      expect(stats.nivel?.nombre).toBe('Oro');
      expect(stats.progreso.puntos_siguiente_nivel).toBeNull();
      expect(stats.progreso.porcentaje).toBe(100);
    });
  });
});

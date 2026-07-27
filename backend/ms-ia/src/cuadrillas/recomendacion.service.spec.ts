import { of } from 'rxjs';
import type { ClientProxy } from '@nestjs/microservices';
import { RecomendacionCuadrillaService } from './recomendacion.service';

interface CuadrillaFixture {
  id: number;
  nombre: string;
  activa: boolean;
  especialidad_id: number | null;
  especialidad_nombre: string | null;
  especialidad_categoria_id: number | null;
  casos_activos: number;
}

interface GrupoFixture {
  id: number;
  codigo_obra: string;
  categoria_id: number | null;
  estado_actual: string;
  cuadrilla_id: number | null;
  cuadrilla_nombre?: string | null;
}

function makeAdminClient(grupo: GrupoFixture | null, cuadrillas: CuadrillaFixture[]) {
  return {
    send: jest.fn((pattern: string) => {
      if (pattern === 'admin.get_group') {
        if (!grupo) return of({ status: 'error', message: 'Caso de Obra no encontrado' });
        return of(grupo);
      }
      if (pattern === 'admin.list_cuadrillas') return of(cuadrillas);
      throw new Error(`pattern inesperado: ${pattern}`);
    }),
  } as unknown as ClientProxy;
}

const GRUPO_BACHE: GrupoFixture = {
  id: 12,
  codigo_obra: 'O-26-0000012',
  categoria_id: 1,
  estado_actual: 'Aceptado',
  cuadrilla_id: null,
};

function cuadrilla(over: Partial<CuadrillaFixture> & { id: number; nombre: string }) {
  return {
    activa: true,
    especialidad_id: null,
    especialidad_nombre: null,
    especialidad_categoria_id: null,
    casos_activos: 0,
    ...over,
  } as CuadrillaFixture;
}

describe('RecomendacionCuadrillaService', () => {
  it('prefiere la cuadrilla cuya especialidad atiende la categoria del caso', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, [
      cuadrilla({
        id: 1,
        nombre: 'Bacheo Norte',
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
      }),
      cuadrilla({
        id: 2,
        nombre: 'Alumbrado 1',
        especialidad_id: 2,
        especialidad_nombre: 'Alumbrado público',
        especialidad_categoria_id: 2,
      }),
      cuadrilla({ id: 3, nombre: 'Apoyo' }),
    ]);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.recomendada?.cuadrilla_id).toBe(1);
    // El comodin (sin especialidad) le gana a la especialidad ajena.
    expect(r.ranking.map((c) => c.cuadrilla_id)).toEqual([1, 3, 2]);
    expect(r.traza.map((t) => t.id)).toEqual(['R0', 'R1', 'R2', 'R3']);
  });

  it('a igual especialidad, desempata por carga actual', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, [
      cuadrilla({
        id: 1,
        nombre: 'Bacheo Norte',
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
        casos_activos: 4,
      }),
      cuadrilla({
        id: 2,
        nombre: 'Bacheo Sur',
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
        casos_activos: 1,
      }),
    ]);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.recomendada?.cuadrilla_id).toBe(2);
    expect(r.recomendada?.puntaje).toBe(55); // 60 - 1*5
  });

  it('la especialidad pesa mas que la carga: no basta con estar libre', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, [
      cuadrilla({
        id: 1,
        nombre: 'Bacheo Norte',
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
        casos_activos: 5,
      }),
      cuadrilla({ id: 2, nombre: 'Apoyo', casos_activos: 0 }),
    ]);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.recomendada?.cuadrilla_id).toBe(1); // 60-25=35 vs 20
  });

  it('descarta las cuadrillas dadas de baja', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, [
      cuadrilla({
        id: 1,
        nombre: 'Bacheo Este',
        activa: false,
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
      }),
      cuadrilla({ id: 2, nombre: 'Apoyo' }),
    ]);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.ranking.map((c) => c.cuadrilla_id)).toEqual([2]);
    expect(r.recomendada?.cuadrilla_id).toBe(2);
  });

  it('sin cuadrillas activas no recomienda nada, pero no rompe', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, []);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.recomendada).toBeNull();
    expect(r.ranking).toEqual([]);
    expect(r.nota).toContain('No hay cuadrillas activas');
  });

  it('un caso sin categoria no puede matchear por especialidad', async () => {
    const admin = makeAdminClient({ ...GRUPO_BACHE, categoria_id: null }, [
      cuadrilla({
        id: 1,
        nombre: 'Bacheo Norte',
        especialidad_id: 1,
        especialidad_nombre: 'Bacheo y pavimento',
        especialidad_categoria_id: 1,
      }),
      cuadrilla({ id: 2, nombre: 'Apoyo' }),
    ]);

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.recomendada?.cuadrilla_id).toBe(2); // comodin 20 > especialidad ajena 0
    expect(r.traza.find((t) => t.id === 'R1')?.conclusion).toContain('no tiene categoría');
  });

  it('informa la cuadrilla que el caso ya tiene asignada', async () => {
    const admin = makeAdminClient(
      { ...GRUPO_BACHE, cuadrilla_id: 9, cuadrilla_nombre: 'Bacheo Sur' },
      [cuadrilla({ id: 9, nombre: 'Bacheo Sur', casos_activos: 1 })],
    );

    const r = await new RecomendacionCuadrillaService(admin).recomendar(12);

    expect(r.cuadrilla_actual).toEqual({ id: 9, nombre: 'Bacheo Sur' });
  });

  it('rechaza un grupo_id que no es entero', async () => {
    const admin = makeAdminClient(GRUPO_BACHE, []);

    await expect(new RecomendacionCuadrillaService(admin).recomendar(NaN)).rejects.toThrow(
      'grupo_id es requerido',
    );
  });
});

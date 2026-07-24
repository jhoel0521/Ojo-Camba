import { of } from 'rxjs';
import { SugerenciaHechosService } from './sugerencia-hechos.service';
import type { GroqProvider } from '../ai/groq.provider';

function makeRegisterClient(reportes: Record<number, { categoria_id: number }>) {
  return {
    send: jest.fn((pattern: string, payload: unknown) => {
      if (pattern === 'register.get_report') {
        const id = (payload as { report_id: number }).report_id;
        return of(reportes[id] ?? { categoria_id: 6 });
      }
      if (pattern === 'register.get_imagen') {
        return of({ data: `base64-${payload}`, contentType: 'image/jpeg' });
      }
      throw new Error(`pattern inesperado: ${pattern}`);
    }),
  };
}

interface GrupoFixture {
  id: number;
  codigo_obra: string;
  estado_actual: string;
  categoria_id: number;
  creado_en: string;
  reportes: { id: number; gravedad: string }[];
}

function makeAdminClient(grupos: Record<number, GrupoFixture>) {
  return {
    send: jest.fn((pattern: string, payload: unknown) => {
      const id = (payload as { grupo_id: number }).grupo_id;
      const grupo = grupos[id];
      if (pattern === 'admin.get_group') {
        if (!grupo) return of({ status: 'error', message: 'Caso de Obra no encontrado' });
        return of({
          id: grupo.id,
          codigo_obra: grupo.codigo_obra,
          estado_actual: grupo.estado_actual,
          categoria_id: grupo.categoria_id,
          creado_en: grupo.creado_en,
        });
      }
      if (pattern === 'admin.list_group_reports') {
        return of(grupo?.reportes ?? []);
      }
      throw new Error(`pattern inesperado: ${pattern}`);
    }),
  };
}

function makeGroq(respuesta: string) {
  return { chatConImagenes: jest.fn().mockResolvedValue(respuesta) } as unknown as GroqProvider;
}

const SIN_OBRAS = makeAdminClient({});

describe('SugerenciaHechosService', () => {
  it('parsea una respuesta JSON valida completa', async () => {
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'via_principal',
        palabra_clave_riesgo: true,
        parece_lluvia: true,
        duplicados: [{ reporte_id: 2, es_mismo_problema: true, justificacion: 'mismo bache' }],
        pertenece_a_obra: null,
        justificacion_breve: 'Se ve un bache grande en una avenida.',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 }, 2: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(SIN_OBRAS as never, register as never, groq);

    const r = await service.sugerir({ reporte_id: 1, nearby_report_ids: [2] });

    expect(r.ubicacion_sensible).toBe('via_principal');
    expect(r.palabra_clave_riesgo).toBe(true);
    expect(r.parece_lluvia).toBe(true);
    expect(r.duplicados).toEqual([
      { reporte_id: 2, es_mismo_problema: true, justificacion: 'mismo bache' },
    ]);
    expect(r.pertenece_a_obra).toBeNull();
    expect(r.justificacion_breve).toContain('bache');
  });

  it('extrae el JSON aunque venga envuelto en fences de markdown', async () => {
    const groq = makeGroq(
      '```json\n' +
        JSON.stringify({
          ubicacion_sensible: 'escuela',
          palabra_clave_riesgo: false,
          parece_lluvia: false,
          duplicados: [],
          pertenece_a_obra: null,
          justificacion_breve: 'ok',
        }) +
        '\n```',
    );
    const register = makeRegisterClient({ 1: { categoria_id: 2 } });
    const service = new SugerenciaHechosService(SIN_OBRAS as never, register as never, groq);

    const r = await service.sugerir({ reporte_id: 1 });

    expect(r.ubicacion_sensible).toBe('escuela');
  });

  it('cae a defaults seguros si la IA no devuelve JSON interpretable', async () => {
    const groq = makeGroq('No puedo ayudarte con eso.');
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(SIN_OBRAS as never, register as never, groq);

    const r = await service.sugerir({ reporte_id: 1 });

    expect(r.ubicacion_sensible).toBe('ninguna');
    expect(r.palabra_clave_riesgo).toBe(false);
    expect(r.parece_lluvia).toBe(false);
    expect(r.duplicados).toEqual([]);
    expect(r.pertenece_a_obra).toBeNull();
  });

  it('descarta duplicados con reporte_id que no estaba entre los cercanos enviados (anti-alucinacion)', async () => {
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'ninguna',
        palabra_clave_riesgo: false,
        parece_lluvia: false,
        duplicados: [
          { reporte_id: 999, es_mismo_problema: true, justificacion: 'inventado' },
          { reporte_id: 2, es_mismo_problema: true, justificacion: 'real' },
        ],
        pertenece_a_obra: null,
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 }, 2: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(SIN_OBRAS as never, register as never, groq);

    const r = await service.sugerir({ reporte_id: 1, nearby_report_ids: [2] });

    expect(r.duplicados.map((d) => d.reporte_id)).toEqual([2]);
  });

  it('recorta a un maximo de 4 reportes cercanos (limite de 5 imagenes por request de Groq)', async () => {
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'ninguna',
        palabra_clave_riesgo: false,
        parece_lluvia: false,
        duplicados: [],
        pertenece_a_obra: null,
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(SIN_OBRAS as never, register as never, groq);

    await service.sugerir({ reporte_id: 1, nearby_report_ids: [2, 3, 4, 5, 6, 7] });

    const llamada = (groq.chatConImagenes as jest.Mock).mock.calls[0];
    const imagenes = llamada[1] as unknown[];
    expect(imagenes).toHaveLength(5); // 1 principal + 4 cercanos como maximo
  });

  it('arma el contexto de obras_cercanas (sin fotos) y acepta pertenece_a_obra valido', async () => {
    const admin = makeAdminClient({
      12: {
        id: 12,
        codigo_obra: 'O-26-0000012',
        estado_actual: 'En trabajo',
        categoria_id: 1,
        creado_en: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        reportes: [
          { id: 101, gravedad: 'Alta' },
          { id: 102, gravedad: 'Media' },
        ],
      },
    });
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'ninguna',
        palabra_clave_riesgo: false,
        parece_lluvia: false,
        duplicados: [],
        pertenece_a_obra: { grupo_id: 12, pertenece: true, justificacion: 'mismo bache' },
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(admin as never, register as never, groq);

    const r = await service.sugerir({ reporte_id: 1, nearby_group_ids: [12] });

    expect(r.pertenece_a_obra).toEqual({
      grupo_id: 12,
      pertenece: true,
      justificacion: 'mismo bache',
    });

    // El prompt debe incluir el bloque JSON de obras_cercanas con la info de la obra 12.
    const promptEnviado = (groq.chatConImagenes as jest.Mock).mock.calls[0][0] as string;
    expect(promptEnviado).toContain('"grupo_id": 12');
    expect(promptEnviado).toContain('O-26-0000012');
    expect(promptEnviado).toContain('"antiguedad_dias": 5');
    // La foto de la obra NO se manda: solo va la imagen del reporte principal.
    const imagenesEnviadas = (groq.chatConImagenes as jest.Mock).mock.calls[0][1] as unknown[];
    expect(imagenesEnviadas).toHaveLength(1);
  });

  it('descarta pertenece_a_obra con grupo_id que no estaba entre las obras enviadas (anti-alucinacion)', async () => {
    const admin = makeAdminClient({
      12: {
        id: 12,
        codigo_obra: 'O-26-0000012',
        estado_actual: 'En trabajo',
        categoria_id: 1,
        creado_en: new Date().toISOString(),
        reportes: [],
      },
    });
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'ninguna',
        palabra_clave_riesgo: false,
        parece_lluvia: false,
        duplicados: [],
        pertenece_a_obra: { grupo_id: 999, pertenece: true, justificacion: 'inventado' },
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(admin as never, register as never, groq);

    // Ojo: 999 nunca se manda como nearby_group_ids (solo existe 12) -> se descarta igual.
    const r = await service.sugerir({ reporte_id: 1, nearby_group_ids: [12] });

    expect(r.pertenece_a_obra).toBeNull();
  });
});

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

function makeGroq(respuesta: string) {
  return { chatConImagenes: jest.fn().mockResolvedValue(respuesta) } as unknown as GroqProvider;
}

describe('SugerenciaHechosService', () => {
  it('parsea una respuesta JSON valida completa', async () => {
    const groq = makeGroq(
      JSON.stringify({
        ubicacion_sensible: 'via_principal',
        palabra_clave_riesgo: true,
        parece_lluvia: true,
        duplicados: [{ reporte_id: 2, es_mismo_problema: true, justificacion: 'mismo bache' }],
        justificacion_breve: 'Se ve un bache grande en una avenida.',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 }, 2: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(register as never, groq);

    const r = await service.sugerir({ reporte_id: 1, nearby_report_ids: [2] });

    expect(r.ubicacion_sensible).toBe('via_principal');
    expect(r.palabra_clave_riesgo).toBe(true);
    expect(r.parece_lluvia).toBe(true);
    expect(r.duplicados).toEqual([
      { reporte_id: 2, es_mismo_problema: true, justificacion: 'mismo bache' },
    ]);
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
          justificacion_breve: 'ok',
        }) +
        '\n```',
    );
    const register = makeRegisterClient({ 1: { categoria_id: 2 } });
    const service = new SugerenciaHechosService(register as never, groq);

    const r = await service.sugerir({ reporte_id: 1 });

    expect(r.ubicacion_sensible).toBe('escuela');
  });

  it('cae a defaults seguros si la IA no devuelve JSON interpretable', async () => {
    const groq = makeGroq('No puedo ayudarte con eso.');
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(register as never, groq);

    const r = await service.sugerir({ reporte_id: 1 });

    expect(r.ubicacion_sensible).toBe('ninguna');
    expect(r.palabra_clave_riesgo).toBe(false);
    expect(r.parece_lluvia).toBe(false);
    expect(r.duplicados).toEqual([]);
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
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 }, 2: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(register as never, groq);

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
        justificacion_breve: '',
      }),
    );
    const register = makeRegisterClient({ 1: { categoria_id: 1 } });
    const service = new SugerenciaHechosService(register as never, groq);

    await service.sugerir({ reporte_id: 1, nearby_report_ids: [2, 3, 4, 5, 6, 7] });

    const llamada = (groq.chatConImagenes as jest.Mock).mock.calls[0];
    const imagenes = llamada[1] as unknown[];
    expect(imagenes).toHaveLength(5); // 1 principal + 4 cercanos como maximo
  });
});

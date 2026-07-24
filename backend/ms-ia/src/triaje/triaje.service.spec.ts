import { BadRequestException } from '@nestjs/common';
import { TriajeService } from './triaje.service';

describe('TriajeService', () => {
  const service = new TriajeService();

  it('bache en via_principal dispara R4 y sugiere Alta', () => {
    const r = service.inferir({
      categoria_id: 1,
      creado_en: new Date().toISOString(),
      distancias_cercanas_m: [],
      ubicacion_sensible: 'via_principal',
      palabra_clave_riesgo: false,
    });
    expect(r.gravedad_sugerida).toBe('Alta');
    expect(r.traza.map((t) => t.id)).toContain('R4');
  });

  it('palabra_clave_riesgo=true dispara R1 y sugiere Emergencia', () => {
    const r = service.inferir({
      categoria_id: 4,
      creado_en: new Date().toISOString(),
      palabra_clave_riesgo: true,
    });
    expect(r.gravedad_sugerida).toBe('Emergencia');
    expect(r.traza.map((t) => t.id)).toContain('R1');
    expect(r.accion).toBe('Notificar de inmediato al Back Office');
  });

  it('ubicacion_sensible por defecto es "ninguna" si no se manda o es invalida', () => {
    const r = service.inferir({
      categoria_id: 1,
      creado_en: new Date().toISOString(),
      ubicacion_sensible: 'lugar_inventado' as never,
    });
    expect(r.hechos.ubicacion_sensible).toBe('ninguna');
  });

  it('rechaza categoria_id faltante con BadRequestException', () => {
    expect(() => service.inferir({ creado_en: new Date().toISOString() } as never)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza creado_en faltante con BadRequestException', () => {
    expect(() => service.inferir({ categoria_id: 1 } as never)).toThrow(BadRequestException);
  });

  it('temporada_forzada pisa el calendario: mismo canal_obstruido en julio sin regla vs. con R2 al forzar lluvias', () => {
    const hechosBase = {
      categoria_id: 4, // canal_obstruido
      creado_en: '2026-07-24T10:00:00.000Z', // julio -> "seca" por calendario
      ubicacion_sensible: 'via_principal' as const,
      palabra_clave_riesgo: false,
    };

    const sinForzar = service.inferir(hechosBase);
    expect(sinForzar.hechos.temporada).toBe('seca');
    expect(sinForzar.gravedad_sugerida).toBeNull(); // ninguna regla cubre canal_obstruido en seca

    const forzandoLluvias = service.inferir({ ...hechosBase, temporada_forzada: 'lluvias' });
    expect(forzandoLluvias.hechos.temporada).toBe('lluvias');
    expect(forzandoLluvias.gravedad_sugerida).toBe('Emergencia');
    expect(forzandoLluvias.traza.map((t) => t.id)).toContain('R2');
  });
});

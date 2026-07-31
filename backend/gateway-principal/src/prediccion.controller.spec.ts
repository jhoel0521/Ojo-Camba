import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AccionRecomendacion, ROLES, TCP_PATTERNS } from '@ojo-camba/common';
import { of } from 'rxjs';
import { PrediccionController } from './prediccion.controller';
import { ROLES_REQUERIDOS, TokenValidation } from './roles.guard';

/**
 * Contrato del proxy hacia ms-prediccion (ISSUE-31) y del panel de decisión
 * (ISSUE-32).
 *
 * Acá se prueban las cosas que el microservicio Python no puede probar por sí
 * mismo: quién llega a cada ruta —el control de roles vive en el gateway—, qué
 * ve el coordinador cuando el servicio de predicción no está disponible, y que
 * lo observado y lo estimado nunca se mezclen en un solo número.
 */

const rolesDe = (metodo: keyof PrediccionController): string[] =>
  Reflect.getMetadata(ROLES_REQUERIDOS, PrediccionController.prototype[metodo]) as string[];

const respuesta = (cuerpo: unknown, { ok = true, status = 200 } = {}) =>
  ({ ok, status, json: async () => cuerpo }) as Response;

const sesion = (rol: string): { user: TokenValidation } => ({
  user: { valid: true, user_id: 7, roles: [rol] },
});

describe('PrediccionController', () => {
  let controlador: PrediccionController;
  let fetchMock: jest.Mock;
  let adminSend: jest.Mock;

  beforeEach(() => {
    adminSend = jest.fn().mockReturnValue(of({}));
    controlador = new PrediccionController({ send: adminSend } as unknown as ClientProxy);
    fetchMock = jest.fn().mockResolvedValue(respuesta({}));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const rutaPedida = () =>
    new URL(fetchMock.mock.calls[0][0] as string).pathname +
    new URL(fetchMock.mock.calls[0][0] as string).search;

  describe('roles', () => {
    it('deja consultar el pronóstico al coordinador y a la autoridad municipal', () => {
      expect(rolesDe('pronostico')).toEqual([
        ROLES.COORDINADOR_OPERATIVO,
        ROLES.AUTORIDAD_MUNICIPAL,
      ]);
    });

    it('reserva las alertas accionables para el coordinador', () => {
      // ISSUE-32: la autoridad municipal consulta el agregado, no las
      // recomendaciones sobre las que se opera.
      expect(rolesDe('alertas')).toEqual([ROLES.COORDINADOR_OPERATIVO]);
    });

    it('deja reentrenar sólo a IT', () => {
      // Es una operación pesada: en el VPS actual compite por memoria con el
      // resto de la plataforma.
      expect(rolesDe('entrenar')).toEqual([ROLES.ENCARGADO_IT]);
    });

    it('suma a IT en los metadatos del modelo, que son de diagnóstico', () => {
      expect(rolesDe('modelo')).toContain(ROLES.ENCARGADO_IT);
    });

    it('deja decidir sólo al coordinador', () => {
      // ISSUE-32: la autoridad municipal consulta, no opera.
      expect(rolesDe('registrarDecision')).toEqual([ROLES.COORDINADOR_OPERATIVO]);
    });

    it('abre la comparativa y el historial también a la autoridad municipal', () => {
      // Son datos agregados: sin fotos ni reportes individuales.
      for (const ruta of ['comparativa', 'listarDecisiones'] as const) {
        expect(rolesDe(ruta)).toEqual([ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL]);
      }
    });

    it('no le da a la autoridad municipal ninguna ruta que opere', () => {
      const operativas: (keyof PrediccionController)[] = [
        'alertas',
        'registrarDecision',
        'entrenar',
      ];
      for (const ruta of operativas) {
        expect(rolesDe(ruta)).not.toContain(ROLES.AUTORIDAD_MUNICIPAL);
      }
    });

    it('no deja ninguna ruta sin roles declarados', () => {
      const rutas: (keyof PrediccionController)[] = [
        'modelo',
        'pronostico',
        'alertas',
        'entrenar',
        'comparativa',
        'registrarDecision',
        'listarDecisiones',
      ];
      for (const ruta of rutas) {
        expect(rolesDe(ruta)?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('armado de la consulta', () => {
    it('no manda query cuando no hay filtros', async () => {
      await controlador.pronostico();
      expect(rutaPedida()).toBe('/pronostico');
    });

    it('pasa zona y categoría cuando vienen', async () => {
      await controlador.pronostico('8928308280fffff', '3');
      expect(rutaPedida()).toBe('/pronostico?zona=8928308280fffff&categoria_id=3');
    });

    it('pide sólo las alertas críticas por defecto', async () => {
      await controlador.alertas();
      expect(rutaPedida()).toBe('/alertas?solo_criticas=true');
    });

    it('sólo el valor "false" trae también las normales', async () => {
      await controlador.alertas('false');
      expect(rutaPedida()).toBe('/alertas?solo_criticas=false');
    });

    it('entrena por POST y con margen de tiempo para el reentrenamiento', async () => {
      const reloj = jest.spyOn(AbortSignal, 'timeout');
      await controlador.entrenar('8');

      expect(rutaPedida()).toBe('/entrenar?semanas_prueba=8');
      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
      // Comparar tres modelos con validación cruzada temporal no entra en los
      // 30 s del resto de las rutas.
      expect(reloj).toHaveBeenCalledWith(300_000);
    });
  });

  describe('cuando el servicio de predicción falla', () => {
    it('responde 503 y dice que no respondió, en vez de un 500 opaco', async () => {
      fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(controlador.modelo()).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining('no respondió'),
      });
    });

    it('propaga el estado y el detalle del microservicio', async () => {
      // 409 es el estado normal de un despliegue nuevo: todavía no hay modelo.
      fetchMock.mockResolvedValue(
        respuesta({ detail: 'No hay modelo entrenado.' }, { ok: false, status: 409 }),
      );

      await expect(controlador.pronostico()).rejects.toMatchObject({
        status: 409,
        message: 'No hay modelo entrenado.',
      });
    });

    it('no se cae si el error viene sin cuerpo JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('respuesta vacía');
        },
      } as unknown as Response);

      const error = await controlador.alertas().catch((e: HttpException) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(502);
    });
  });

  describe('comparativa actual vs. predicción (ISSUE-32)', () => {
    const observado = {
      origen: 'observacion',
      periodo: { desde: '2026-07-27', hasta: '2026-08-02' },
      total_casos: 5,
      detalle: [
        { zona_h3: 'zona-a', categoria_id: 1, casos: 3 },
        { zona_h3: 'zona-a', categoria_id: 2, casos: 2 },
      ],
    };
    const estimado = {
      periodo: { desde: '2026-08-03', hasta: '2026-08-09' },
      version_modelo: 'v1',
      version_dataset: 'd1',
      modelo: 'regresion_lineal',
      origen: 'estimacion',
      total_casos_estimados: 9,
      detalle: [
        {
          zona_h3: 'zona-a',
          categoria_id: 1,
          casos_estimados: 2,
          margen_error: 1,
          confianza: 'baja',
        },
        {
          zona_h3: 'zona-a',
          categoria_id: 2,
          casos_estimados: 6,
          margen_error: 1,
          confianza: 'alta',
        },
        {
          zona_h3: 'zona-b',
          categoria_id: 1,
          casos_estimados: 1,
          margen_error: 1,
          confianza: 'media',
        },
      ],
    };

    beforeEach(() => {
      adminSend.mockReturnValue(of(observado));
      fetchMock.mockResolvedValue(respuesta(estimado));
    });

    it('nunca funde observado y estimado en un solo número', async () => {
      const resultado = await controlador.comparativa();

      const zonaA = resultado.zonas.find((z) => z.zona_h3 === 'zona-a');
      expect(zonaA).toMatchObject({ casos_observados: 5, casos_estimados: 8, diferencia: 3 });
      // Cada lado conserva su procedencia.
      expect(resultado.observado.origen).toBe('observacion');
      expect(resultado.estimado?.origen).toBe('estimacion');
      expect(resultado.estimado?.version_modelo).toBe('v1');
    });

    it('etiqueta la zona con la categoría y la confianza que dominan la estimación', async () => {
      const resultado = await controlador.comparativa();

      const zonaA = resultado.zonas.find((z) => z.zona_h3 === 'zona-a');
      // categoria 2 estima 6 casos contra 2 de la categoria 1.
      expect(zonaA?.categoria_estimada).toBe(2);
      expect(zonaA?.confianza).toBe('alta');
    });

    it('incluye zonas que sólo aparecen en la estimación, con cero observado', async () => {
      const resultado = await controlador.comparativa();

      expect(resultado.zonas.find((z) => z.zona_h3 === 'zona-b')).toMatchObject({
        casos_observados: 0,
        casos_estimados: 1,
      });
    });

    it('sigue mostrando lo observado cuando todavía no hay modelo entrenado', async () => {
      fetchMock.mockResolvedValue(
        respuesta({ detail: 'No hay modelo entrenado.' }, { ok: false, status: 409 }),
      );

      const resultado = await controlador.comparativa();

      expect(resultado.observado.total_casos).toBe(5);
      expect(resultado.estimado).toBeNull();
      expect(resultado.motivo_sin_estimacion).toContain('No hay modelo entrenado');
      // Sin estimación no se inventa una diferencia.
      expect(resultado.zonas.every((z) => z.diferencia === null)).toBe(true);
    });

    it('usa la semana en curso cuando no le pasan período', async () => {
      await controlador.comparativa();

      const payload = adminSend.mock.calls[0][1] as { desde: string; hasta: string };
      expect(payload.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(payload.desde).getUTCDay()).toBe(1); // lunes
      expect(payload.desde <= payload.hasta).toBe(true);
    });

    it('propaga los filtros a los dos lados', async () => {
      await controlador.comparativa('2026-07-01', '2026-07-07', '3', 'EnTrabajo');

      expect(adminSend.mock.calls[0][1]).toMatchObject({
        desde: '2026-07-01',
        hasta: '2026-07-07',
        categoria_id: 3,
        estado: 'EnTrabajo',
      });
      expect(fetchMock.mock.calls[0][0]).toContain('categoria_id=3');
    });
  });

  describe('registro de la decisión (ISSUE-32)', () => {
    const recomendacion = {
      zona_h3: 'zona-a',
      categoria_id: 2,
      nivel: 'apoyo',
      accion: AccionRecomendacion.Descartada,
      motivo: 'La cuadrilla 4 ya tiene refuerzo asignado esta semana.',
      recomendacion_original: 'Solicitar apoyo para la zona zona-a',
      factores: ['temporada de lluvias'],
      riesgo: 1.4,
      casos_estimados: 8,
      periodo_desde: '2026-08-03',
      periodo_hasta: '2026-08-09',
    };

    it('atribuye la decisión al usuario del token, no a lo que mande el navegador', async () => {
      await controlador.registrarDecision(sesion(ROLES.COORDINADOR_OPERATIVO), {
        ...recomendacion,
        // Un cliente malicioso podría intentar firmar a nombre de otro.
        decidido_por_usuario_id: 99,
      } as never);

      expect(adminSend).toHaveBeenCalledWith(
        TCP_PATTERNS.ADMIN.REGISTRAR_DECISION_RECOMENDACION,
        expect.objectContaining({ decidido_por_usuario_id: 7 }),
      );
    });

    it('manda la recomendación completa para poder auditarla después', async () => {
      await controlador.registrarDecision(sesion(ROLES.COORDINADOR_OPERATIVO), recomendacion);

      expect(adminSend.mock.calls[0][1]).toMatchObject({
        zona_h3: 'zona-a',
        accion: AccionRecomendacion.Descartada,
        motivo: recomendacion.motivo,
        recomendacion_original: recomendacion.recomendacion_original,
        riesgo: 1.4,
        periodo_desde: '2026-08-03',
      });
    });
  });
});

import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { ROLES } from '@ojo-camba/common';
import { PrediccionController } from './prediccion.controller';
import { ROLES_REQUERIDOS } from './roles.guard';

/**
 * Contrato del proxy hacia ms-prediccion (ISSUE-31).
 *
 * Acá se prueban dos cosas que el microservicio Python no puede probar por sí
 * mismo: quién llega a cada ruta —el control de roles vive en el gateway— y qué
 * ve el coordinador cuando el servicio de predicción no está disponible.
 */

const rolesDe = (metodo: keyof PrediccionController): string[] =>
  Reflect.getMetadata(ROLES_REQUERIDOS, PrediccionController.prototype[metodo]) as string[];

const respuesta = (cuerpo: unknown, { ok = true, status = 200 } = {}) =>
  ({ ok, status, json: async () => cuerpo }) as Response;

describe('PrediccionController', () => {
  let controlador: PrediccionController;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    controlador = new PrediccionController();
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

    it('no deja ninguna ruta sin roles declarados', () => {
      const rutas: (keyof PrediccionController)[] = ['modelo', 'pronostico', 'alertas', 'entrenar'];
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
});

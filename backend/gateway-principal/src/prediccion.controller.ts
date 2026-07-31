import { Controller, Get, HttpException, Post, Query, UseGuards } from '@nestjs/common';
import { ROLES } from '@ojo-camba/common';
import { RequireRoles, RolesGuard } from './roles.guard';

/**
 * Proxy hacia ms-prediccion (ISSUE-31).
 *
 * Es el único microservicio que habla HTTP en vez del TCP de NestJS: está
 * escrito en Python porque el pipeline de Machine Learning (pandas y
 * scikit-learn) vive ahí. Por eso no usa ClientProxy como el resto.
 *
 * El servicio no se publica con dominio propio: sólo se llega por este
 * gateway, que es donde se comprueban los roles.
 */
const MS_PREDICCION_URL = process.env.MS_PREDICCION_URL ?? 'http://localhost:3007';
const TIEMPO_MAXIMO_MS = 30_000;
/** Reentrenar tarda: compara tres modelos con validación cruzada temporal. */
const TIEMPO_MAXIMO_ENTRENAMIENTO_MS = 300_000;

async function pedir<T>(ruta: string, opciones: { method?: string; timeoutMs?: number } = {}) {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${MS_PREDICCION_URL}${ruta}`, {
      method: opciones.method ?? 'GET',
      signal: AbortSignal.timeout(opciones.timeoutMs ?? TIEMPO_MAXIMO_MS),
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'error desconocido';
    throw new HttpException(`El servicio de predicción no respondió: ${detalle}`, 503);
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as T & { detail?: string };
  if (!respuesta.ok) {
    throw new HttpException(
      cuerpo?.detail ?? 'Error en el servicio de predicción',
      respuesta.status,
    );
  }
  return cuerpo;
}

@Controller('prediccion')
@UseGuards(RolesGuard)
export class PrediccionController {
  /** Metadatos del modelo: métricas comparadas, procedencia y limitaciones. */
  @Get('modelo')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL, ROLES.ENCARGADO_IT)
  modelo() {
    return pedir('/modelo');
  }

  /** Casos de Obra esperados por zona H3 y categoría en los próximos 7 días. */
  @Get('pronostico')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL)
  pronostico(@Query('zona') zona?: string, @Query('categoria_id') categoriaId?: string) {
    const parametros = new URLSearchParams();
    if (zona) parametros.set('zona', zona);
    if (categoriaId) parametros.set('categoria_id', categoriaId);
    const consulta = parametros.toString();
    return pedir(`/pronostico${consulta ? `?${consulta}` : ''}`);
  }

  /**
   * Alertas de capacidad al 80% y 100%. Sólo el coordinador: es quien decide
   * sobre la operación. La autoridad municipal consulta el agregado, no las
   * recomendaciones accionables (ISSUE-32).
   */
  @Get('alertas')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO)
  alertas(@Query('solo_criticas') soloCriticas?: string) {
    const valor = soloCriticas === 'false' ? 'false' : 'true';
    return pedir(`/alertas?solo_criticas=${valor}`);
  }

  /**
   * Reentrena y vuelve a comparar los tres modelos. Restringido a IT: es una
   * operación pesada y en el servidor actual compite por memoria con el resto
   * de la plataforma.
   */
  @Post('entrenar')
  @RequireRoles(ROLES.ENCARGADO_IT)
  entrenar(@Query('semanas_prueba') semanasPrueba?: string) {
    const consulta = semanasPrueba ? `?semanas_prueba=${semanasPrueba}` : '';
    return pedir(`/entrenar${consulta}`, {
      method: 'POST',
      timeoutMs: TIEMPO_MAXIMO_ENTRENAMIENTO_MS,
    });
  }
}

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AccionRecomendacion, ROLES, TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { RequireRoles, RolesGuard, TokenValidation } from './roles.guard';

type AuthenticatedRequest = { user: TokenValidation };

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
// Mismo par MS_X_HOST/MS_X_PORT que el resto de los microservicios: la URL se
// construye aca porque es el unico servicio HTTP (el resto son ClientProxy TCP).
const MS_PREDICCION_URL = `http://${process.env.MS_PREDICCION_HOST ?? 'localhost'}:${
  process.env.MS_PREDICCION_PORT ?? '3007'
}`;
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

interface DetallePronostico {
  zona_h3: string;
  categoria_id: number;
  casos_estimados: number;
  margen_error: number;
  confianza: string;
}

interface RespuestaPronostico {
  periodo: { desde: string | null; hasta: string | null };
  version_modelo: string;
  version_dataset: string;
  modelo: string;
  origen: string;
  total_casos_estimados: number;
  detalle: DetallePronostico[];
}

interface CasosObservados {
  origen: string;
  periodo: { desde: string; hasta: string };
  total_casos: number;
  detalle: Array<{ zona_h3: string; categoria_id: number; casos: number }>;
}

function aFecha(valor: Date): string {
  return valor.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const resultado = new Date(`${fecha}T00:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return aFecha(resultado);
}

function diasEntre(desde: string, hasta: string): number {
  const inicio = new Date(`${desde}T00:00:00Z`).getTime();
  const fin = new Date(`${hasta}T00:00:00Z`).getTime();
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

@Controller('prediccion')
@UseGuards(RolesGuard)
export class PrediccionController {
  constructor(@Inject('MS_ADMIN') private readonly admin: ClientProxy) {}

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

  /**
   * Actual vs. predicción (ISSUE-32). Los dos lados viajan **separados**, cada
   * uno con su `origen`, su período y su procedencia: el criterio 1 pide que una
   * estimación no se pueda confundir nunca con una observación, así que aquí no
   * se suman ni se promedian entre sí. `zonas` sólo los alinea por celda y
   * calcula la diferencia, conservando ambos números.
   *
   * Si todavía nadie entrenó, el lado observado se devuelve igual y `estimado`
   * viaja en null con el motivo: la operación real no depende del modelo.
   *
   * **La diferencia sólo se calcula si los dos períodos duran lo mismo.** El
   * pronóstico siempre cubre 7 días, pero el período observado lo elige quien
   * consulta: restarle una semana estimada a un mes observado daba un número
   * enorme y sin sentido. Por defecto se observan los últimos 7 días completos,
   * que sí son comparables; si se pide otro rango, `diferencia` viaja en null y
   * `periodos_comparables` explica por qué.
   */
  @Get('comparativa')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL)
  async comparativa(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('categoria_id') categoriaId?: string,
    @Query('estado') estado?: string,
  ) {
    // Últimos 7 días completos: la misma duración que pronostica el modelo.
    const ayer = sumarDias(aFecha(new Date()), -1);
    const periodoDesde = desde || sumarDias(ayer, -6);
    const periodoHasta = hasta || ayer;

    const observado = await sendRpc<CasosObservados>(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_CASOS_POR_ZONA, {
        desde: periodoDesde,
        hasta: periodoHasta,
        categoria_id: categoriaId ? parseInt(categoriaId, 10) : null,
        estado: estado || null,
      }),
    );

    let estimado: RespuestaPronostico | null = null;
    let motivoSinEstimacion: string | null = null;
    try {
      const parametros = new URLSearchParams();
      if (categoriaId) parametros.set('categoria_id', categoriaId);
      const consulta = parametros.toString();
      estimado = await pedir<RespuestaPronostico>(`/pronostico${consulta ? `?${consulta}` : ''}`);
    } catch (error) {
      motivoSinEstimacion =
        error instanceof HttpException ? error.message : 'No se pudo obtener el pronóstico.';
    }

    const porZona = new Map<
      string,
      {
        zona_h3: string;
        casos_observados: number;
        casos_estimados: number | null;
        categorias_observadas: number[];
        categoria_estimada: number | null;
        confianza: string | null;
      }
    >();

    const asegurar = (zona: string) => {
      let fila = porZona.get(zona);
      if (!fila) {
        fila = {
          zona_h3: zona,
          casos_observados: 0,
          casos_estimados: estimado ? 0 : null,
          categorias_observadas: [],
          categoria_estimada: null,
          confianza: null,
        };
        porZona.set(zona, fila);
      }
      return fila;
    };

    for (const fila of observado.detalle) {
      const zona = asegurar(fila.zona_h3);
      zona.casos_observados += fila.casos;
      if (!zona.categorias_observadas.includes(fila.categoria_id)) {
        zona.categorias_observadas.push(fila.categoria_id);
      }
    }

    // La categoría y la confianza que se muestran son las de la celda con más
    // Casos estimados: es la que domina la alerta de esa zona.
    const dominante = new Map<string, number>();
    for (const fila of estimado?.detalle ?? []) {
      const zona = asegurar(fila.zona_h3);
      zona.casos_estimados = (zona.casos_estimados ?? 0) + fila.casos_estimados;
      if (fila.casos_estimados > (dominante.get(fila.zona_h3) ?? -1)) {
        dominante.set(fila.zona_h3, fila.casos_estimados);
        zona.categoria_estimada = fila.categoria_id;
        zona.confianza = fila.confianza;
      }
    }

    const diasObservados = diasEntre(periodoDesde, periodoHasta);
    const diasEstimados =
      estimado?.periodo.desde && estimado.periodo.hasta
        ? diasEntre(estimado.periodo.desde, estimado.periodo.hasta)
        : null;
    const comparables = diasEstimados !== null && diasObservados === diasEstimados;

    const zonas = [...porZona.values()]
      .map((fila) => ({
        ...fila,
        casos_estimados:
          fila.casos_estimados == null ? null : Number(fila.casos_estimados.toFixed(2)),
        diferencia:
          fila.casos_estimados == null || !comparables
            ? null
            : Number((fila.casos_estimados - fila.casos_observados).toFixed(2)),
      }))
      .sort(
        (a, b) =>
          (b.casos_estimados ?? b.casos_observados) - (a.casos_estimados ?? a.casos_observados),
      );

    return {
      observado,
      estimado,
      motivo_sin_estimacion: motivoSinEstimacion,
      periodos_comparables: {
        comparables,
        dias_observados: diasObservados,
        dias_estimados: diasEstimados,
        motivo: comparables
          ? null
          : diasEstimados === null
            ? 'No hay pronóstico con el que comparar.'
            : `El período observado dura ${diasObservados} días y el pronosticado ${diasEstimados}: no se puede restar uno del otro.`,
      },
      zonas,
    };
  }

  /**
   * Registra la decisión del coordinador sobre una recomendación. El panel no
   * asigna nada: deja constancia de qué se recomendó, qué se resolvió y por qué.
   */
  @Post('decisiones')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO)
  registrarDecision(
    @Req() request: AuthenticatedRequest,
    @Body()
    dto: {
      zona_h3: string;
      categoria_id?: number | null;
      nivel: string;
      accion: AccionRecomendacion;
      motivo: string;
      recomendacion_original: string;
      factores?: string[];
      riesgo: number;
      casos_estimados: number;
      reportes_estimados?: number | null;
      confianza?: string | null;
      version_modelo?: string | null;
      version_dataset?: string | null;
      periodo_desde: string;
      periodo_hasta: string;
    },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.REGISTRAR_DECISION_RECOMENDACION, {
        ...dto,
        decidido_por_usuario_id: request.user.user_id,
      }),
    );
  }

  /**
   * Historial de decisiones con precisión retrospectiva. La autoridad municipal
   * lo consulta porque es información agregada —sin fotos ni reportes
   * individuales— pero no puede decidir sobre él.
   */
  @Get('decisiones')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO, ROLES.AUTORIDAD_MUNICIPAL)
  listarDecisiones(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('zona') zona?: string,
    @Query('accion') accion?: AccionRecomendacion,
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_DECISIONES_RECOMENDACION, {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        zona: zona || undefined,
        accion: accion || undefined,
      }),
    );
  }
}

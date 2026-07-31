import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccionRecomendacion, DecisionRecomendacion, GrupoReporte } from '@ojo-camba/common';
import { Repository } from 'typeorm';

/**
 * Decisiones del coordinador sobre las recomendaciones de capacidad y
 * comparación entre lo observado y lo estimado (ISSUE-32).
 *
 * Vive en ms-admin y no en ms-prediccion a propósito: el pronóstico es una
 * estimación reproducible a partir del modelo, mientras que la decisión es un
 * hecho operativo con autor y fecha. Además, contar los Casos que de verdad
 * ocurrieron es leer la operación, que es lo que este servicio ya hace.
 *
 * La zona de un Caso se deriva igual que en el dataset del modelo
 * (backend/ms-prediccion/app/dataset.py): la celda H3 res-8 del primer reporte
 * agrupado, ordenando por `id`. Si las dos definiciones divergen, la
 * comparativa "actual vs. predicción" compara cosas distintas sin avisar.
 */

/** Un motivo de una palabra no es una justificación auditable. */
const MOTIVO_MINIMO = 10;

const CASO_ZONA = `
  SELECT
    g.id,
    g.categoria_id,
    g.creado_en,
    g.estado_actual,
    (
      SELECT r.h3_res_8
      FROM reportes r
      WHERE r.grupo_id = g.id
      ORDER BY r.id
      LIMIT 1
    ) AS h3
  FROM grupos_reportes g
`;

export interface RegistrarDecisionDto {
  zona_h3: string;
  categoria_id?: number | null;
  nivel: string;
  accion: AccionRecomendacion;
  motivo: string;
  decidido_por_usuario_id: number;
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
}

export interface ListarDecisionesDto {
  page?: number;
  limit?: number;
  zona?: string;
  accion?: AccionRecomendacion;
}

export interface CasosPorZonaDto {
  desde: string;
  hasta: string;
  categoria_id?: number | null;
  estado?: string | null;
}

interface FilaObservada {
  zona_h3: string;
  categoria_id: number;
  casos: number;
}

function esFecha(valor: unknown): valor is string {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

@Injectable()
export class PrediccionDecisionesService {
  constructor(
    @InjectRepository(DecisionRecomendacion)
    private readonly decisionRepo: Repository<DecisionRecomendacion>,
    @InjectRepository(GrupoReporte)
    private readonly grupoRepo: Repository<GrupoReporte>,
  ) {}

  /**
   * Registra la decisión humana. No toca cuadrillas ni casos: la issue es
   * explícita en que el panel no ejecuta asignaciones, sólo deja constancia de
   * lo que el coordinador resolvió y por qué.
   */
  async registrarDecision(dto: RegistrarDecisionDto) {
    const motivo = (dto.motivo ?? '').trim();
    if (motivo.length < MOTIVO_MINIMO) {
      throw new BadRequestException(
        `El motivo es obligatorio y debe explicar la decisión (mínimo ${MOTIVO_MINIMO} caracteres).`,
      );
    }
    if (!Object.values(AccionRecomendacion).includes(dto.accion)) {
      throw new BadRequestException(
        `Acción inválida: se espera ${Object.values(AccionRecomendacion).join(', ')}.`,
      );
    }
    if (!dto.zona_h3?.trim()) {
      throw new BadRequestException('La decisión debe indicar la zona de la recomendación.');
    }
    if (!esFecha(dto.periodo_desde) || !esFecha(dto.periodo_hasta)) {
      throw new BadRequestException(
        'El período pronosticado es obligatorio (formato AAAA-MM-DD): sin él no se puede medir el acierto después.',
      );
    }

    const decision = this.decisionRepo.create({
      zona_h3: dto.zona_h3.trim(),
      categoria_id: dto.categoria_id ?? null,
      nivel: dto.nivel,
      accion: dto.accion,
      motivo,
      decidido_por_usuario_id: dto.decidido_por_usuario_id,
      recomendacion_original: dto.recomendacion_original,
      factores: dto.factores ?? [],
      riesgo: dto.riesgo,
      casos_estimados: dto.casos_estimados,
      reportes_estimados: dto.reportes_estimados ?? null,
      confianza: dto.confianza ?? null,
      version_modelo: dto.version_modelo ?? null,
      version_dataset: dto.version_dataset ?? null,
      periodo_desde: dto.periodo_desde,
      periodo_hasta: dto.periodo_hasta,
    });
    const guardada = await this.decisionRepo.save(decision);
    return { ...guardada, riesgo: Number(guardada.riesgo) };
  }

  /**
   * Historial con precisión retrospectiva: qué se recomendó, qué decidió la
   * persona y cuántos Casos ocurrieron de verdad en esa zona y semana.
   *
   * Lo observado se cuenta **por zona, sumando categorías**, porque así se
   * calculó `casos_estimados` en la alerta (ver `generar()` en
   * backend/ms-prediccion/app/alertas.py, que suma la zona entera y sólo usa la
   * categoría dominante como etiqueta). Compararlo contra una sola categoría
   * daría un error inventado.
   */
  async listarDecisiones(dto: ListarDecisionesDto = {}) {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));

    const query = this.decisionRepo
      .createQueryBuilder('d')
      .orderBy('d.creado_en', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (dto.zona) query.andWhere('d.zona_h3 = :zona', { zona: dto.zona });
    if (dto.accion) query.andWhere('d.accion = :accion', { accion: dto.accion });

    const [decisiones, total] = await query.getManyAndCount();
    const observados = await this.observadoPorZonaYSemana(decisiones);
    const hoy = new Date().toISOString().slice(0, 10);

    return {
      data: decisiones.map((d) => {
        const estimado = Number(d.casos_estimados);
        // Una semana que todavía no terminó no se puede evaluar: informarla
        // como "0 Casos observados" leería como un pronóstico fallado.
        const cerrado = d.periodo_hasta < hoy;
        const observado = cerrado ? (observados.get(`${d.zona_h3}|${d.periodo_desde}`) ?? 0) : null;

        return {
          ...d,
          riesgo: Number(d.riesgo),
          casos_estimados: estimado,
          reportes_estimados: d.reportes_estimados == null ? null : Number(d.reportes_estimados),
          precision:
            observado == null
              ? { estado: 'pendiente' as const, observado: null, error: null, error_absoluto: null }
              : {
                  estado: 'medida' as const,
                  observado,
                  error: Number((observado - estimado).toFixed(2)),
                  error_absoluto: Number(Math.abs(observado - estimado).toFixed(2)),
                },
        };
      }),
      total,
      page,
      limit,
    };
  }

  /** Una sola consulta para todas las decisiones de la página. */
  private async observadoPorZonaYSemana(decisiones: DecisionRecomendacion[]) {
    const observados = new Map<string, number>();
    if (decisiones.length === 0) return observados;

    const zonas = [...new Set(decisiones.map((d) => d.zona_h3))];
    const desde = decisiones.reduce(
      (min, d) => (d.periodo_desde < min ? d.periodo_desde : min),
      decisiones[0].periodo_desde,
    );
    const hasta = decisiones.reduce(
      (max, d) => (d.periodo_hasta > max ? d.periodo_hasta : max),
      decisiones[0].periodo_hasta,
    );

    const filas: Array<{ zona_h3: string; semana: string; casos: number }> =
      await this.grupoRepo.query(
        `
        WITH caso_zona AS (${CASO_ZONA})
        SELECT
          h3 AS zona_h3,
          to_char(date_trunc('week', creado_en), 'YYYY-MM-DD') AS semana,
          count(*)::int AS casos
        FROM caso_zona
        WHERE h3 = ANY($1)
          AND creado_en >= $2::date
          AND creado_en < ($3::date + interval '1 day')
        GROUP BY 1, 2
        `,
        [zonas, desde, hasta],
      );

    for (const fila of filas) {
      observados.set(`${fila.zona_h3}|${fila.semana}`, Number(fila.casos));
    }
    return observados;
  }

  /**
   * Casos **observados** por zona y categoría en un período. Es el lado
   * "Actual" de la comparativa: datos reales, no estimación. El `origen` viaja
   * en la respuesta para que la interfaz nunca los pinte como pronóstico
   * (criterio 1 de ISSUE-32).
   */
  async casosPorZona(dto: CasosPorZonaDto) {
    if (!esFecha(dto.desde) || !esFecha(dto.hasta)) {
      throw new BadRequestException('El período es obligatorio (formato AAAA-MM-DD).');
    }
    if (dto.desde > dto.hasta) {
      throw new BadRequestException('El período empieza después de terminar.');
    }

    const parametros: unknown[] = [dto.desde, dto.hasta];
    let filtros = '';
    if (dto.categoria_id != null) {
      parametros.push(dto.categoria_id);
      filtros += ` AND categoria_id = $${parametros.length}`;
    }
    if (dto.estado) {
      parametros.push(dto.estado);
      filtros += ` AND estado_actual = $${parametros.length}`;
    }

    const filas: FilaObservada[] = await this.grupoRepo.query(
      `
      WITH caso_zona AS (${CASO_ZONA})
      SELECT h3 AS zona_h3, categoria_id, count(*)::int AS casos
      FROM caso_zona
      WHERE h3 IS NOT NULL
        AND categoria_id IS NOT NULL
        AND creado_en >= $1::date
        AND creado_en < ($2::date + interval '1 day')
        ${filtros}
      GROUP BY 1, 2
      ORDER BY casos DESC
      `,
      parametros,
    );

    const detalle = filas.map((fila) => ({
      zona_h3: fila.zona_h3,
      categoria_id: Number(fila.categoria_id),
      casos: Number(fila.casos),
    }));

    return {
      origen: 'observacion' as const,
      periodo: { desde: dto.desde, hasta: dto.hasta },
      total_casos: detalle.reduce((suma, fila) => suma + fila.casos, 0),
      detalle,
    };
  }
}

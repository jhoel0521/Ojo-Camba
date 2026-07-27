import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  TCP_PATTERNS,
  analizarRuta,
  centroide,
  haversineM,
  MAX_REPORTES_COMPARACION,
  type UbicacionSensible,
  type Temporada,
  type ReporteRuta,
} from '@ojo-camba/common';
import { sendRpc } from '../rpc.helper';
import type { AiToolkit } from '../ai/ai-toolkit';
import type { AiToolDefinition } from '../ai/ai-provider';
import { TriajeService } from '../triaje/triaje.service';
import { RecomendacionCuadrillaService } from '../cuadrillas/recomendacion.service';

/** Reporte tal como lo devuelven ms-register / ms-admin (subconjunto que usamos). */
interface ReporteCrudo {
  id: number;
  categoria_id: number;
  lat: number | string;
  lng: number | string;
  gravedad: string;
  creado_en: string;
}

const UBICACIONES: UbicacionSensible[] = ['ninguna', 'via_principal', 'escuela', 'hospital'];
const TEMPORADAS: Temporada[] = ['lluvias', 'seca'];
const RUTAS_VALIDAS = ['/', '/revisar', '/casos', '/usuarios'];

/**
 * Herramientas del asistente de Ojo Camba. Cada una lee datos reales (vía TCP) o
 * corre el motor simbólico; ninguna deja que el LLM invente cifras. Las
 * explicaciones (`explicar_triaje`, `explicar_ruta`) devuelven la traza del
 * motor de reglas / búsqueda, que el modelo solo relata.
 */
@Injectable()
export class AsistenteToolkit implements AiToolkit {
  constructor(
    @Inject('MS_ADMIN') private readonly admin: ClientProxy,
    @Inject('MS_REGISTER') private readonly register: ClientProxy,
    private readonly triaje: TriajeService,
    private readonly recomendacionCuadrilla: RecomendacionCuadrillaService,
  ) {}

  definitions(): AiToolDefinition[] {
    return [
      {
        name: 'resumen_pendientes',
        description:
          'Devuelve el resumen operativo actual del Back Office: reportes pendientes, aceptados hoy, casos activos, reportes activos y dispositivos baneados. Usalo para responder "cómo estamos", "cuántos pendientes hay", etc.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        name: 'listar_casos',
        description:
          'Lista los Casos de Obra (grupos de reportes) más recientes, con su código y estado. Opcionalmente filtra por estado.',
        parameters: {
          type: 'object',
          properties: {
            estado: {
              type: 'string',
              description: 'Estado del caso para filtrar (opcional), p. ej. "En trabajo".',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'explicar_triaje',
        description:
          'Corre el sistema experto de triaje para un reporte y devuelve la gravedad sugerida y la traza de reglas SI-ENTONCES que la justifican. La explicación se apoya en esta traza; no inventes la gravedad. tres hechos dependen de criterio humano: ubicacion_sensible, palabra_clave_riesgo y temporada_forzada (pasalos si el operador los indica).',
        parameters: {
          type: 'object',
          properties: {
            reporte_id: { type: 'integer', description: 'ID del reporte a evaluar.' },
            ubicacion_sensible: {
              type: 'string',
              enum: UBICACIONES,
              description: 'Contexto sensible del lugar. Por defecto "ninguna".',
            },
            palabra_clave_riesgo: {
              type: 'boolean',
              description:
                'true si la descripción menciona riesgo (hundimiento, cable caído, colapso, herido). Por defecto false.',
            },
            temporada_forzada: {
              type: 'string',
              enum: TEMPORADAS,
              description:
                'Por defecto la temporada se calcula por calendario (nov-mar=lluvias, abr-oct=seca), pero eso es solo un promedio y puede no coincidir con el clima real (ej. un surazo trae lluvia fuerte en invierno). Si el operador te dice que está lloviendo o que está seco ahora mismo, pasá este valor para que pise al calendario.',
            },
          },
          required: ['reporte_id'],
          additionalProperties: false,
        },
      },
      {
        name: 'explicar_ruta',
        description:
          'Calcula la ruta sugerida para visitar los reportes de un Caso de Obra usando búsqueda en espacio de estados (Backtracking con prioridad por gravedad). La Base es el centroide del caso (el servidor no tiene el GPS del técnico). Devuelve el orden recomendado y la comparación de algoritmos.',
        parameters: {
          type: 'object',
          properties: {
            grupo_id: { type: 'integer', description: 'ID del Caso de Obra (grupo).' },
          },
          required: ['grupo_id'],
          additionalProperties: false,
        },
      },
      {
        name: 'recomendar_cuadrilla',
        description:
          'Recomienda qué cuadrilla mandar a un Caso de Obra, puntuando por especialidad (que atienda la categoría del caso) y por carga actual (casos activos ya asignados). Devuelve el ranking completo con la traza de reglas: no inventes la recomendación ni los puntajes, relatá los que devuelve la herramienta.',
        parameters: {
          type: 'object',
          properties: {
            grupo_id: { type: 'integer', description: 'ID del Caso de Obra (grupo).' },
          },
          required: ['grupo_id'],
          additionalProperties: false,
        },
      },
      {
        name: 'navegar',
        description: `Navega el navegador del operador a una pantalla del Back Office. Rutas válidas: ${RUTAS_VALIDAS.join(', ')}. Para un caso puntual podés usar "/casos/ID".`,
        parameters: {
          type: 'object',
          properties: {
            ruta: { type: 'string', description: 'Ruta interna, empezando con "/".' },
          },
          required: ['ruta'],
          additionalProperties: false,
        },
      },
    ];
  }

  async execute(name: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (name) {
      case 'resumen_pendientes':
        return this.resumenPendientes();
      case 'listar_casos':
        return this.listarCasos(input);
      case 'explicar_triaje':
        return this.explicarTriaje(input);
      case 'explicar_ruta':
        return this.explicarRuta(input);
      case 'recomendar_cuadrilla':
        return this.recomendarCuadrilla(input);
      case 'navegar':
        return this.navegar(input);
      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  }

  private async resumenPendientes(): Promise<Record<string, unknown>> {
    const stats = await sendRpc<Record<string, unknown>>(
      this.admin.send(TCP_PATTERNS.ADMIN.DASHBOARD, {}),
    );
    return { stats };
  }

  private async listarCasos(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const estado = typeof input.estado === 'string' ? input.estado : undefined;
    const res = await sendRpc<{ data?: unknown[] }>(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_GROUPS, { page: 1, limit: 10, estado }),
    );
    return { casos: res?.data ?? res ?? [] };
  }

  private async explicarTriaje(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const reporteId = Number(input.reporte_id);
    if (!Number.isInteger(reporteId)) return { error: 'reporte_id debe ser un entero.' };

    const ubicacion: UbicacionSensible = UBICACIONES.includes(
      input.ubicacion_sensible as UbicacionSensible,
    )
      ? (input.ubicacion_sensible as UbicacionSensible)
      : 'ninguna';
    const palabraClave = input.palabra_clave_riesgo === true;
    const temporadaForzada = TEMPORADAS.includes(input.temporada_forzada as Temporada)
      ? (input.temporada_forzada as Temporada)
      : undefined;

    let reporte: ReporteCrudo;
    try {
      reporte = await sendRpc<ReporteCrudo>(
        this.register.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: reporteId }),
      );
    } catch {
      return { error: `No encontré el reporte #${reporteId}.` };
    }

    const lat = Number(reporte.lat);
    const lng = Number(reporte.lng);

    // Recurrencia: reportes dentro de 100 m (el propio reporte cuenta como 1).
    let distanciasCercanas: number[] = [];
    try {
      const cercanos = await sendRpc<ReporteCrudo[]>(
        this.admin.send(TCP_PATTERNS.ADMIN.LIST_NEARBY_REPORTS, { lat, lng, radius: 100 }),
      );
      distanciasCercanas = (cercanos ?? [])
        .filter((r) => r.id !== reporteId)
        .map((r) => haversineM({ lat, lng }, { lat: Number(r.lat), lng: Number(r.lng) }));
    } catch {
      distanciasCercanas = [];
    }

    // Misma fuente de verdad que usa GravedadSugerida.tsx en el backoffice.
    const resultado = this.triaje.inferir({
      categoria_id: reporte.categoria_id,
      creado_en: reporte.creado_en,
      distancias_cercanas_m: distanciasCercanas,
      ubicacion_sensible: ubicacion,
      palabra_clave_riesgo: palabraClave,
      temporada_forzada: temporadaForzada,
    });

    return {
      reporte_id: reporteId,
      categoria_id: reporte.categoria_id,
      gravedad_sugerida: resultado.gravedad_sugerida,
      accion: resultado.accion,
      hechos: resultado.hechos,
      traza: resultado.traza.map((r) => ({
        id: r.id,
        bloque: r.bloque,
        conclusion: r.conclusion,
        regla: r.texto,
      })),
      nota: 'La gravedad y la traza salen del sistema experto; ubicacion_sensible, palabra_clave_riesgo y temporada_forzada dependen de criterio humano.',
    };
  }

  private async explicarRuta(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const grupoId = Number(input.grupo_id);
    if (!Number.isInteger(grupoId)) return { error: 'grupo_id debe ser un entero.' };

    let reportes: ReporteCrudo[];
    try {
      reportes = await sendRpc<ReporteCrudo[]>(
        this.admin.send(TCP_PATTERNS.ADMIN.LIST_GROUP_REPORTS, { grupo_id: grupoId }),
      );
    } catch {
      return { error: `No encontré el Caso de Obra #${grupoId}.` };
    }

    const nodos: ReporteRuta[] = (reportes ?? []).map((r) => ({
      id: r.id,
      lat: Number(r.lat),
      lng: Number(r.lng),
      gravedad: r.gravedad,
      categoria_id: r.categoria_id,
    }));

    if (nodos.length < 2) {
      return {
        grupo_id: grupoId,
        reportes: nodos.length,
        mensaje: 'El caso tiene menos de dos reportes: no hace falta sugerir un orden de visita.',
      };
    }

    const base = centroide(nodos);
    // analizarRuta calcula el óptimo exacto mientras es viable (≤8 reportes) y cae
    // a la heurística de respaldo por encima de eso, en vez de no sugerir nada.
    const analisis = analizarRuta(base, nodos);
    const rec = analisis.recomendada;

    return {
      grupo_id: grupoId,
      reportes: nodos.length,
      base: 'centroide del caso (sin GPS del técnico)',
      exacto: analisis.exacto,
      recomendado: {
        algoritmo: rec.algoritmo,
        total_metros: Math.round(rec.costoM),
        respeta_prioridad: rec.respetaPrioridad,
        orden: rec.tramos.map((t, i) => ({
          posicion: i + 1,
          reporte_id: t.reporte.id,
          gravedad: t.reporte.gravedad,
          metros_desde_anterior: Math.round(t.distanciaM),
        })),
      },
      comparacion: analisis.comparacion
        ? analisis.comparacion.map((r) => ({
            algoritmo: r.algoritmo,
            total_metros: Math.round(r.costoM),
            estados_explorados: r.estadosExplorados,
            optima: r.optima,
            respeta_prioridad: r.respetaPrioridad,
          }))
        : null,
      nota: analisis.exacto
        ? 'Backtracking es el recomendado: mínimo costo entre las rutas que respetan la prioridad por gravedad.'
        : `El caso tiene ${nodos.length} reportes (más de ${MAX_REPORTES_COMPARACION}), así que se usó una heurística (vecino más cercano por prioridad + mejora local): sugiere un buen orden, no necesariamente el óptimo exacto.`,
    };
  }

  private async recomendarCuadrilla(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const grupoId = Number(input.grupo_id);
    if (!Number.isInteger(grupoId)) return { error: 'grupo_id debe ser un entero.' };

    try {
      const r = await this.recomendacionCuadrilla.recomendar(grupoId);
      return { ...r } as unknown as Record<string, unknown>;
    } catch {
      return { error: `No pude recomendar una cuadrilla para el Caso de Obra #${grupoId}.` };
    }
  }

  private navegar(input: Record<string, unknown>): Record<string, unknown> {
    const ruta = typeof input.ruta === 'string' ? input.ruta.trim() : '';
    const permitida =
      RUTAS_VALIDAS.includes(ruta) || /^\/casos\/\d+$/.test(ruta) || /^\/grupos\/\d+$/.test(ruta);
    if (!permitida) {
      return { error: `Ruta no permitida: "${ruta}". Válidas: ${RUTAS_VALIDAS.join(', ')}.` };
    }
    return { redirect: ruta, mensaje: `Navegando a ${ruta}.` };
  }
}

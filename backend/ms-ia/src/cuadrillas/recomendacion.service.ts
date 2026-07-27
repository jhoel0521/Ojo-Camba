import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from '../rpc.helper';

/** Caso de Obra tal como lo devuelve ms-admin (subconjunto que usamos). */
interface GrupoCrudo {
  id: number;
  codigo_obra: string;
  categoria_id: number | null;
  estado_actual: string;
  cuadrilla_id: number | null;
  cuadrilla_nombre?: string | null;
}

/** Cuadrilla tal como la devuelve admin.list_cuadrillas (con carga ya calculada). */
interface CuadrillaCruda {
  id: number;
  nombre: string;
  activa: boolean;
  especialidad_id: number | null;
  especialidad_nombre: string | null;
  especialidad_categoria_id: number | null;
  casos_activos: number;
}

export interface ReglaRecomendacion {
  id: string;
  bloque: 'especialidad' | 'carga' | 'disponibilidad';
  texto: string;
  conclusion: string;
}

export interface CuadrillaPuntuada {
  cuadrilla_id: number;
  nombre: string;
  especialidad_nombre: string | null;
  casos_activos: number;
  puntaje: number;
  motivos: string[];
}

export interface ResultadoRecomendacion {
  grupo_id: number;
  codigo_obra: string;
  categoria_id: number | null;
  cuadrilla_actual: { id: number; nombre: string | null } | null;
  recomendada: CuadrillaPuntuada | null;
  ranking: CuadrillaPuntuada[];
  traza: ReglaRecomendacion[];
  nota: string;
}

// Pesos del score. La especialidad domina sobre la carga a propósito: mandar la
// cuadrilla equivocada al caso cuesta más que mandar una cargada — con estos
// valores harían falta 8 casos activos de diferencia para que una cuadrilla sin
// especialidad le gane a una que sí matchea.
const PUNTOS_ESPECIALIDAD_MATCH = 60;
const PUNTOS_SIN_ESPECIALIDAD = 20;
const PUNTOS_ESPECIALIDAD_DISTINTA = 0;
const PENALIZACION_POR_CASO_ACTIVO = 5;

/**
 * Recomienda qué cuadrilla mandar a un Caso de Obra. Es un score explicable, no
 * un LLM: mismo principio que el motor de triaje — el sistema puntúa y muestra
 * por qué, el moderador decide. Vive en ms-ia porque es la capa de "sugerencias"
 * del sistema, pero no consulta la base: le pide los datos a ms-admin por TCP.
 */
@Injectable()
export class RecomendacionCuadrillaService {
  constructor(@Inject('MS_ADMIN') private readonly admin: ClientProxy) {}

  async recomendar(grupoId: number): Promise<ResultadoRecomendacion> {
    if (!Number.isInteger(grupoId)) throw new BadRequestException('grupo_id es requerido.');

    const grupo = await sendRpc<GrupoCrudo>(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_GROUP, { grupo_id: grupoId }),
    );

    const cuadrillas = await sendRpc<CuadrillaCruda[]>(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_CUADRILLAS, { solo_activas: true }),
    );

    const disponibles = (cuadrillas ?? []).filter((c) => c.activa);
    const traza: ReglaRecomendacion[] = [
      {
        id: 'R0',
        bloque: 'disponibilidad',
        texto: 'SI la cuadrilla está dada de baja ENTONCES no se la considera.',
        conclusion: `${disponibles.length} cuadrilla(s) activa(s) de ${(cuadrillas ?? []).length} registrada(s).`,
      },
    ];

    const cuadrillaActual = grupo.cuadrilla_id
      ? { id: grupo.cuadrilla_id, nombre: grupo.cuadrilla_nombre ?? null }
      : null;

    if (disponibles.length === 0) {
      return {
        grupo_id: grupo.id,
        codigo_obra: grupo.codigo_obra,
        categoria_id: grupo.categoria_id,
        cuadrilla_actual: cuadrillaActual,
        recomendada: null,
        ranking: [],
        traza,
        nota: 'No hay cuadrillas activas registradas: no puedo recomendar ninguna.',
      };
    }

    const ranking = disponibles
      .map((c) => this.puntuar(c, grupo.categoria_id))
      .sort((a, b) => b.puntaje - a.puntaje || a.casos_activos - b.casos_activos);

    const conEspecialidadDelCaso = disponibles.filter(
      (c) => grupo.categoria_id != null && c.especialidad_categoria_id === grupo.categoria_id,
    );

    traza.push({
      id: 'R1',
      bloque: 'especialidad',
      texto: `SI la especialidad de la cuadrilla atiende la categoría del caso ENTONCES suma ${PUNTOS_ESPECIALIDAD_MATCH} puntos; si no declara especialidad, ${PUNTOS_SIN_ESPECIALIDAD}.`,
      conclusion:
        grupo.categoria_id == null
          ? 'El caso no tiene categoría definida: ninguna cuadrilla puede matchear por especialidad.'
          : `${conEspecialidadDelCaso.length} cuadrilla(s) atiende(n) la categoría del caso.`,
    });

    traza.push({
      id: 'R2',
      bloque: 'carga',
      texto: `SI la cuadrilla ya tiene casos activos ENTONCES resta ${PENALIZACION_POR_CASO_ACTIVO} puntos por cada uno.`,
      conclusion: `Carga actual: ${ranking.map((c) => `${c.nombre}=${c.casos_activos}`).join(', ')}.`,
    });

    const recomendada = ranking[0];
    traza.push({
      id: 'R3',
      bloque: 'disponibilidad',
      texto:
        'ENTONCES se recomienda la cuadrilla con mayor puntaje (a igual puntaje, la menos cargada).',
      conclusion: `Recomendada: "${recomendada.nombre}" con ${recomendada.puntaje} puntos.`,
    });

    return {
      grupo_id: grupo.id,
      codigo_obra: grupo.codigo_obra,
      categoria_id: grupo.categoria_id,
      cuadrilla_actual: cuadrillaActual,
      recomendada,
      ranking,
      traza,
      nota:
        conEspecialidadDelCaso.length === 0 && grupo.categoria_id != null
          ? 'Ninguna cuadrilla tiene la especialidad de este caso: la recomendación sale solo por disponibilidad.'
          : 'El puntaje sale de reglas explícitas (especialidad + carga), no de un modelo de lenguaje.',
    };
  }

  private puntuar(cuadrilla: CuadrillaCruda, categoriaId: number | null): CuadrillaPuntuada {
    const motivos: string[] = [];
    let puntaje: number;

    if (
      cuadrilla.especialidad_categoria_id != null &&
      cuadrilla.especialidad_categoria_id === categoriaId
    ) {
      puntaje = PUNTOS_ESPECIALIDAD_MATCH;
      motivos.push(`Su especialidad ("${cuadrilla.especialidad_nombre}") atiende esta categoría.`);
    } else if (cuadrilla.especialidad_id == null) {
      puntaje = PUNTOS_SIN_ESPECIALIDAD;
      motivos.push('No tiene especialidad declarada: sirve como comodín.');
    } else {
      puntaje = PUNTOS_ESPECIALIDAD_DISTINTA;
      motivos.push(`Su especialidad ("${cuadrilla.especialidad_nombre}") es de otra categoría.`);
    }

    if (cuadrilla.casos_activos > 0) {
      puntaje -= cuadrilla.casos_activos * PENALIZACION_POR_CASO_ACTIVO;
      motivos.push(
        `Tiene ${cuadrilla.casos_activos} caso(s) activo(s): −${cuadrilla.casos_activos * PENALIZACION_POR_CASO_ACTIVO} puntos por carga.`,
      );
    } else {
      motivos.push('Sin casos activos.');
    }

    return {
      cuadrilla_id: cuadrilla.id,
      nombre: cuadrilla.nombre,
      especialidad_nombre: cuadrilla.especialidad_nombre,
      casos_activos: cuadrilla.casos_activos,
      puntaje,
      motivos,
    };
  }
}

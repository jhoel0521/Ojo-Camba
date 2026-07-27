import { BadRequestException, Injectable } from '@nestjs/common';
import {
  inferirTriaje,
  tipoDesdeCategoria,
  temporadaDeFecha,
  horasTranscurridas,
  recurrenciaDesdeCercanos,
  type BloqueTriaje,
  type GravedadValor,
  type Temporada,
  type UbicacionSensible,
} from '@ojo-camba/common';

export interface InferirTriajeDto {
  categoria_id: number;
  creado_en: string;
  distancias_cercanas_m?: number[];
  ubicacion_sensible?: UbicacionSensible;
  palabra_clave_riesgo?: boolean;
  /**
   * El calendario (nov-mar = lluvias) es un default, no un hecho: un surazo de
   * invierno puede traer lluvia fuerte fuera de esa ventana. Si se manda, pisa
   * al calendario — el operador conoce el clima real mejor que una fecha.
   */
  temporada_forzada?: Temporada;
}

export interface TrazaTriajeDto {
  id: string;
  bloque: BloqueTriaje;
  texto: string;
  conclusion: string;
}

export interface InferirTriajeResultado {
  gravedad_sugerida: GravedadValor | null;
  accion: string | null;
  hechos: {
    tipo: string;
    temporada: 'lluvias' | 'seca';
    ubicacion_sensible: UbicacionSensible;
    recurrencia: number;
    horas: number;
    palabra_clave_riesgo: boolean;
  };
  traza: TrazaTriajeDto[];
}

const UBICACIONES: UbicacionSensible[] = ['ninguna', 'via_principal', 'escuela', 'hospital'];
const TEMPORADAS: Temporada[] = ['lluvias', 'seca'];

/**
 * Fuente única del motor de triaje para todo el sistema: la usa tanto
 * `AsistenteToolkit.explicarTriaje` (LLM, parte de un reporte_id) como el
 * endpoint HTTP que consume `GravedadSugerida.tsx` en el backoffice (parte de
 * hechos ya conocidos en pantalla). Misma lógica, misma traza, sin divergencia.
 */
@Injectable()
export class TriajeService {
  inferir(dto: InferirTriajeDto): InferirTriajeResultado {
    const categoriaId = Number(dto?.categoria_id);
    if (!Number.isInteger(categoriaId)) throw new BadRequestException('categoria_id es requerido.');
    if (!dto?.creado_en) throw new BadRequestException('creado_en es requerido.');

    const ubicacion: UbicacionSensible = UBICACIONES.includes(
      dto.ubicacion_sensible as UbicacionSensible,
    )
      ? (dto.ubicacion_sensible as UbicacionSensible)
      : 'ninguna';

    const temporada: Temporada = TEMPORADAS.includes(dto.temporada_forzada as Temporada)
      ? (dto.temporada_forzada as Temporada)
      : temporadaDeFecha(new Date());

    const hechos = {
      tipo: tipoDesdeCategoria(categoriaId),
      temporada,
      ubicacion_sensible: ubicacion,
      recurrencia: recurrenciaDesdeCercanos(dto.distancias_cercanas_m ?? []),
      horas: horasTranscurridas(dto.creado_en),
      palabra_clave_riesgo: dto.palabra_clave_riesgo === true,
    };

    const { gravedad, traza, accion } = inferirTriaje(hechos);

    return {
      gravedad_sugerida: gravedad,
      accion,
      hechos: { ...hechos, horas: Math.floor(hechos.horas) },
      traza: traza.map((r) => ({
        id: r.id,
        bloque: r.bloque,
        texto: r.texto,
        conclusion: r.conclusion,
      })),
    };
  }
}

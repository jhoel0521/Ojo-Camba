import {
  IsArray,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gravedad } from '@ojo-camba/common';

export const MOTIVOS_DESCARTE_DIGITAL = [
  'evidencia_insuficiente',
  'imagen_no_corresponde',
  'contenido_duplicado_sin_aporte',
  'contenido_inapropiado',
] as const;
export type MotivoDescarteDigital = (typeof MOTIVOS_DESCARTE_DIGITAL)[number];

export class CreateGroupDto {
  @IsArray()
  @ArrayMinSize(2)
  @Type(() => Number)
  @IsInt({ each: true })
  report_ids: number[];

  @IsInt()
  creado_por_usuario_id: number;

  // Categoría final determinada por Backoffice/IA. Permite corregir una
  // selección equivocada del ciudadano antes de consolidar el Caso de Obra.
  @IsOptional()
  @IsInt()
  categoria_id?: number;
}

export class UpdateCaseDto {
  @IsInt()
  grupo_id: number;

  @IsInt()
  usuario_id: number;

  @IsNotEmpty()
  comentario: string;

  url_imagen?: string;
  estado_nuevo?: string;
  recursos_solicitados?: string;
  fecha_estimada_fin?: string;
  lat_actualizada?: number;
  lng_actualizada?: number;
}

export class AcceptReportDto {
  @IsInt()
  report_id: number;

  @IsInt()
  moderador_id: number;

  @IsOptional()
  @IsInt()
  categoria_id?: number;

  @IsOptional()
  @IsInt()
  grupo_id?: number;

  // El moderador puede ajustar la gravedad al aceptar (triaje asistido).
  @IsOptional()
  @IsIn(Object.values(Gravedad))
  gravedad?: string;
}

export class RejectReportDto {
  @IsInt()
  report_id: number;

  @IsInt()
  moderador_id: number;

  @IsIn(MOTIVOS_DESCARTE_DIGITAL)
  motivo: MotivoDescarteDigital;
}

export class CreateCuadrillaDto {
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsInt()
  especialidad_id?: number;
}

export class UpdateCuadrillaDto {
  @IsInt()
  cuadrilla_id: number;

  @IsOptional()
  @IsNotEmpty()
  nombre?: string;

  // null desvincula la especialidad; undefined la deja como está.
  @IsOptional()
  @IsInt()
  especialidad_id?: number | null;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

export class AsignarCuadrillaDto {
  @IsInt()
  grupo_id: number;

  // null desasigna la cuadrilla del caso.
  @IsOptional()
  @IsInt()
  cuadrilla_id?: number | null;

  @IsInt()
  usuario_id: number;
}

export class BanDeviceDto {
  @IsNotEmpty()
  device_id: string;

  @IsNotEmpty()
  motivo: string;
}

import { IsArray, IsInt, IsNotEmpty, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @IsArray()
  @ArrayMinSize(2)
  @Type(() => Number)
  @IsInt({ each: true })
  report_ids: number[];

  @IsInt()
  creado_por_usuario_id: number;
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
}

export class RejectReportDto {
  @IsInt()
  report_id: number;
}

export class BanDeviceDto {
  @IsNotEmpty()
  device_id: string;

  motivo: string;
}

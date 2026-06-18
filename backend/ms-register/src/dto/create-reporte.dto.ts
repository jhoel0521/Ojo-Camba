import { IsString, IsNumber, IsOptional, IsIn, Max, Min } from 'class-validator';
import { Gravedad } from '@ojo-camba/common';

export class CreateReporteDto {
  @IsString()
  device_id: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsNumber()
  categoria_id: number;

  @IsOptional()
  @IsIn(Object.values(Gravedad))
  gravedad?: string;

  @IsOptional()
  @IsNumber()
  usuario_id?: number;

  @IsOptional()
  @IsString()
  imagen_base64?: string;
}

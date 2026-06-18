import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReportesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoria_id?: number;

  @IsOptional()
  @IsString()
  h3_res_8?: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuario_id?: number;

  @IsOptional()
  @IsString()
  h3_cell?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  h3_resolution?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grupo_id?: number;
}

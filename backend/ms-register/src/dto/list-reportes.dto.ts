import { IsOptional, IsInt, IsString, Min } from 'class-validator';
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
}

import { IsInt, IsOptional, IsString } from 'class-validator';

export class AwardPointsDto {
  @IsInt()
  user_id: number;

  @IsOptional()
  @IsInt()
  puntos?: number;

  @IsOptional()
  @IsInt()
  report_id?: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class GetUserStatsDto {
  @IsInt()
  user_id: number;
}

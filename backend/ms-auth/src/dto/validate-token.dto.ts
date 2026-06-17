import { IsString, IsInt } from 'class-validator';

export class ValidateTokenDto {
  @IsString()
  token: string;
}

export class GetProfileDto {
  @IsInt()
  user_id: number;
}

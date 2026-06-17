import { IsString, IsInt } from 'class-validator';

export class RefreshDto {
  @IsString()
  refresh_token: string;
}

export class LogoutDto {
  @IsInt()
  user_id: number;
}

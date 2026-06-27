import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(TCP_PATTERNS.AUTH.PING)
  ping() {
    return { status: 'ok', service: 'ms-auth' };
  }

  @MessagePattern(TCP_PATTERNS.AUTH.REGISTER)
  register(@Payload() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.LOGIN)
  login(@Payload() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.REFRESH)
  refreshToken(@Payload() dto: { refresh_token: string }) {
    return this.authService.refresh(dto.refresh_token);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.LOGOUT)
  logout(@Payload() dto: { user_id: number }) {
    return this.authService.logout(dto.user_id);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.VALIDATE_TOKEN)
  validateToken(@Payload() dto: { token: string }) {
    return this.authService.validateToken(dto.token);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.GET_PROFILE)
  getProfile(@Payload() dto: { user_id: number }) {
    return this.authService.getProfile(dto.user_id);
  }

  @MessagePattern(TCP_PATTERNS.AUTH.LIST_USERS)
  listUsers(@Payload() dto: { page?: number; limit?: number; q?: string }) {
    return this.authService.listUsers(dto.page, dto.limit, dto.q);
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { firstValueFrom } from 'rxjs';

interface TokenValidation {
  valid: boolean;
  user_id: number | null;
  roles: string[];
}

@Injectable()
export class BackofficeGuard implements CanActivate {
  constructor(@Inject('MS_AUTH') private readonly auth: ClientProxy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: TokenValidation }>();
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Se requiere un token de acceso.');
    const validation = await firstValueFrom(
      this.auth.send<TokenValidation>(TCP_PATTERNS.AUTH.VALIDATE_TOKEN, { token }),
    );
    if (!validation.valid) throw new UnauthorizedException('Token de acceso inválido o expirado.');
    if (!validation.roles.some((role) => role === 'moderador' || role === 'admin')) {
      throw new ForbiddenException('Esta función requiere un rol de Backoffice.');
    }
    request.user = validation;
    return true;
  }
}

@Injectable()
export class AiConfigurationGuard extends BackofficeGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<{ user?: TokenValidation }>();
    if (!request.user?.roles.includes('admin')) {
      throw new ForbiddenException('Solo administradores pueden cambiar proveedores de IA.');
    }
    return true;
  }
}

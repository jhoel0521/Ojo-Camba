import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ROLES, tieneAlgunRol, TCP_PATTERNS } from '@ojo-camba/common';
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
    if (!tieneAlgunRol(validation.roles, [ROLES.BACKOFFICE])) {
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
    if (!request.user || !tieneAlgunRol(request.user.roles, [ROLES.ENCARGADO_IT])) {
      throw new ForbiddenException('Solo administradores pueden cambiar proveedores de IA.');
    }
    return true;
  }
}

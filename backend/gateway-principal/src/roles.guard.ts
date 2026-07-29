import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { tieneAlgunRol, TCP_PATTERNS } from '@ojo-camba/common';
import { firstValueFrom } from 'rxjs';

export const ROLES_REQUERIDOS = 'roles_requeridos';
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_REQUERIDOS, roles);

export interface TokenValidation {
  valid: boolean;
  user_id: number | null;
  email?: string | null;
  roles: string[];
}

/** Punto único de autorización HTTP. Los TCP internos reciben el actor validado. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('MS_AUTH') private readonly auth: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: TokenValidation }>();
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Se requiere un token de acceso.');

    const validation = await firstValueFrom(
      this.auth.send<TokenValidation>(TCP_PATTERNS.AUTH.VALIDATE_TOKEN, { token }),
    );
    if (!validation.valid || validation.user_id == null) {
      throw new UnauthorizedException('Token de acceso inválido o expirado.');
    }

    const requeridos = this.reflector.getAllAndOverride<string[]>(ROLES_REQUERIDOS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requeridos?.length && !tieneAlgunRol(validation.roles, requeridos)) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción.');
    }
    request.user = validation;
    return true;
  }
}

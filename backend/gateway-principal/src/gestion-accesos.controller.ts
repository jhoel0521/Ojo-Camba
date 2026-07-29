import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ROLES, TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { RequireRoles, RolesGuard, TokenValidation } from './roles.guard';

type AuthenticatedRequest = { user: TokenValidation };

/** Administración de accesos: únicamente para el encargado TI. */
@Controller('administracion')
@UseGuards(RolesGuard)
@RequireRoles(ROLES.ENCARGADO_IT)
export class GestionAccesosController {
  constructor(@Inject('MS_AUTH') private readonly auth: ClientProxy) {}

  @Get('ciudadanos')
  listCiudadanos(@Query() query: { page?: string; limit?: string; q?: string }) {
    return sendRpc(
      this.auth.send(TCP_PATTERNS.AUTH.LIST_CIUDADANOS, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        q: query.q || undefined,
      }),
    );
  }

  @Get('roles')
  listRoles() {
    return sendRpc(this.auth.send(TCP_PATTERNS.AUTH.LIST_ROLES_GESTIONABLES, {}));
  }

  @Get('solicitudes-ti')
  listSolicitudes(@Query() query: { page?: string; limit?: string }) {
    return sendRpc(
      this.auth.send(TCP_PATTERNS.AUTH.LIST_SOLICITUDES_TI, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      }),
    );
  }

  @Post('solicitudes-ti')
  aplicarSolicitud(
    @Req() request: AuthenticatedRequest,
    @Body()
    dto: {
      tipo: string;
      referencia_carta: string;
      comentario?: string;
      cambios?: Array<{ usuario_id: number; roles: string[] }>;
      cuadrilla?: {
        cuadrilla_id?: number;
        nombre?: string;
        especialidad_id?: number | null;
        responsable_usuario_id: number;
        miembro_usuario_ids: number[];
      };
    },
  ) {
    return sendRpc(
      this.auth.send(TCP_PATTERNS.AUTH.APLICAR_SOLICITUD_TI, {
        ...dto,
        ejecutado_por_usuario_id: request.user.user_id,
      }),
    );
  }
}

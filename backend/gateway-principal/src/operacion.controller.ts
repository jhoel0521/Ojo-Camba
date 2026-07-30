import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ROLES, TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { RequireRoles, RolesGuard, TokenValidation } from './roles.guard';

type AuthenticatedRequest = { user: TokenValidation };

/** Rutas protegidas que consume la operación técnica y la configuración municipal. */
@Controller('operacion')
@UseGuards(RolesGuard)
export class OperacionController {
  constructor(@Inject('MS_ADMIN') private readonly admin: ClientProxy) {}

  @Get('tecnico/groups')
  @RequireRoles(ROLES.TECNICO)
  listGruposTecnico(
    @Req() request: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_GRUPOS_TECNICO, {
        usuario_id: request.user.user_id,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('tecnico/groups/nearby')
  @RequireRoles(ROLES.TECNICO)
  async listGruposTecnicoCercanos(
    @Req() request: AuthenticatedRequest,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const asignados = await sendRpc<{ data: Array<{ id: number }> }>(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_GRUPOS_TECNICO, {
        usuario_id: request.user.user_id,
        page: 1,
        limit: 1000,
      }),
    );
    if (asignados.data.length === 0) return [];
    const cercanos = await sendRpc<Array<{ id: number }>>(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_GROUPS_NEARBY, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: radius ? parseInt(radius, 10) : undefined,
      }),
    );
    const permitidos = new Set(asignados.data.map((grupo) => grupo.id));
    return cercanos.filter((grupo) => permitidos.has(grupo.id));
  }

  @Get('tecnico/groups/:id')
  @RequireRoles(ROLES.TECNICO)
  async getGrupoTecnico(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    const grupo_id = parseInt(id, 10);
    await sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_GRUPO_TECNICO, {
        grupo_id,
        usuario_id: request.user.user_id,
      }),
    );
    return sendRpc(this.admin.send(TCP_PATTERNS.ADMIN.GET_GROUP, { grupo_id }));
  }

  @Get('tecnico/groups/:id/timeline')
  @RequireRoles(ROLES.TECNICO)
  async getTimelineTecnico(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    const grupo_id = parseInt(id, 10);
    await sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_GRUPO_TECNICO, {
        grupo_id,
        usuario_id: request.user.user_id,
      }),
    );
    return sendRpc(this.admin.send(TCP_PATTERNS.ADMIN.GET_CASE_TIMELINE, { grupo_id }));
  }

  @Post('tecnico/groups/:id/updates')
  @RequireRoles(ROLES.TECNICO)
  async updateGrupoTecnico(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    const grupo_id = parseInt(id, 10);
    await sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_GRUPO_TECNICO, {
        grupo_id,
        usuario_id: request.user.user_id,
      }),
    );
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.UPDATE_CASE, {
        ...dto,
        grupo_id,
        usuario_id: request.user.user_id,
      }),
    );
  }

  @Post('tecnico/groups/:id/derivaciones')
  @RequireRoles(ROLES.TECNICO)
  registrarDerivacion(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { entidad_destino: string; motivo: string; evidencia_url: string },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.REGISTRAR_DERIVACION, {
        ...dto,
        grupo_id: parseInt(id, 10),
        usuario_id: request.user.user_id,
      }),
    );
  }

  @Get('configuracion')
  @RequireRoles(ROLES.ENCARGADO_IT, ROLES.COORDINADOR_OPERATIVO)
  getConfiguracion() {
    return sendRpc(this.admin.send(TCP_PATTERNS.ADMIN.GET_CONFIGURACION_OPERATIVA, {}));
  }

  @Put('configuracion/:clave')
  @RequireRoles(ROLES.ENCARGADO_IT)
  updateConfiguracion(
    @Req() request: AuthenticatedRequest,
    @Param('clave') clave: string,
    @Body() dto: { valor: number },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.UPDATE_CONFIGURACION_OPERATIVA, {
        clave,
        valor: dto.valor,
        usuario_id: request.user.user_id,
      }),
    );
  }

  @Post('cuadrillas/:id/miembros')
  @RequireRoles(ROLES.ENCARGADO_IT)
  asignarMiembro(
    @Param('id') id: string,
    @Body() dto: { usuario_id: number; es_responsable?: boolean },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.ASIGNAR_MIEMBRO_CUADRILLA, {
        ...dto,
        cuadrilla_id: parseInt(id, 10),
      }),
    );
  }

  @Get('cuadrillas/:id/indicadores')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO, ROLES.ENCARGADO_IT)
  indicadoresCuadrilla(@Param('id') id: string) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_INDICADORES_CUADRILLA, {
        cuadrilla_id: parseInt(id, 10),
      }),
    );
  }
}

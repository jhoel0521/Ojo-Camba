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
import { EstadoCaso, ROLES, TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { RequireRoles, RolesGuard, TokenValidation } from './roles.guard';

type AuthenticatedRequest = { user: TokenValidation };

/** Rutas protegidas que consume la operación técnica y la configuración municipal. */
@Controller('operacion')
@UseGuards(RolesGuard)
export class OperacionController {
  constructor(@Inject('MS_ADMIN') private readonly admin: ClientProxy) {}

  @Get('contexto')
  @RequireRoles(ROLES.TECNICO, ROLES.COORDINADOR_OPERATIVO)
  async contexto(@Req() request: AuthenticatedRequest) {
    const operativo = await sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_CONTEXTO_OPERATIVO, {
        usuario_id: request.user.user_id,
      }),
    );
    return { ...operativo, roles: request.user.roles };
  }

  @Get('mis-obras')
  @RequireRoles(ROLES.TECNICO)
  misObras(
    @Req() request: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_VISITAS_TECNICO, {
        usuario_id: request.user.user_id,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('mi-ruta')
  @RequireRoles(ROLES.TECNICO)
  miRuta(@Req() request: AuthenticatedRequest, @Query('fecha') fecha?: string) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_VISITAS_TECNICO, {
        usuario_id: request.user.user_id,
        page: 1,
        limit: 100,
        fecha,
      }),
    );
  }

  @Get('mi-cuadrilla/visitas')
  @RequireRoles(ROLES.TECNICO)
  visitasMiCuadrilla(
    @Req() request: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.LIST_VISITAS_CUADRILLA, {
        usuario_id: request.user.user_id,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get('visitas/:id')
  @RequireRoles(ROLES.TECNICO)
  detalleVisita(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.GET_VISITA_TECNICO, {
        visita_id: parseInt(id, 10),
        usuario_id: request.user.user_id,
      }),
    );
  }

  @Post('visitas/:id/llegada')
  @RequireRoles(ROLES.TECNICO)
  registrarLlegada(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { lat: number; lng: number },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.REGISTRAR_LLEGADA_VISITA, {
        visita_id: parseInt(id, 10),
        tecnico_id: request.user.user_id,
        lat: dto.lat,
        lng: dto.lng,
      }),
    );
  }

  @Put('mi-cuadrilla/visitas/:id/asignacion')
  @RequireRoles(ROLES.TECNICO)
  asignarVisita(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    dto: {
      tecnico_id: number;
      fecha_planificada: string;
      orden_ruta: number;
      motivo?: string;
    },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.ASIGNAR_VISITA_TECNICO, {
        visita_id: parseInt(id, 10),
        responsable_id: request.user.user_id,
        ...dto,
      }),
    );
  }

  @Post('visitas/:id/propuestas')
  @RequireRoles(ROLES.TECNICO)
  proponerResultadoVisita(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    dto: {
      estado_propuesto: EstadoCaso;
      comentario: string;
      evidencia_url?: string;
      entidad_destino?: string;
      categoria_rechazo_id?: number;
    },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.PROPONER_RESULTADO_VISITA, {
        visita_id: parseInt(id, 10),
        tecnico_id: request.user.user_id,
        ...dto,
      }),
    );
  }

  @Post('mi-cuadrilla/propuestas/:id/confirmar')
  @RequireRoles(ROLES.TECNICO)
  confirmarPropuestaCuadrilla(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { motivo_decision?: string },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.CONFIRMAR_PROPUESTA_VISITA, {
        propuesta_id: parseInt(id, 10),
        usuario_id: request.user.user_id,
        ...dto,
      }),
    );
  }

  @Post('excepciones/propuestas/:id/rechazar')
  @RequireRoles(ROLES.COORDINADOR_OPERATIVO)
  confirmarRechazoCampo(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: { motivo_decision?: string },
  ) {
    return sendRpc(
      this.admin.send(TCP_PATTERNS.ADMIN.CONFIRMAR_PROPUESTA_VISITA, {
        propuesta_id: parseInt(id, 10),
        usuario_id: request.user.user_id,
        ...dto,
      }),
    );
  }

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

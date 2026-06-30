import { Controller, Post, Get, Body, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';
import { EventsGateway } from './events/events.gateway';

@Controller('admin')
export class AdminController {
  constructor(
    @Inject('MS_ADMIN') private readonly client: ClientProxy,
    private readonly events: EventsGateway,
  ) {}

  @Get('reports/nearby')
  listNearbyReports(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_NEARBY_REPORTS, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: radius ? parseInt(radius, 10) : undefined,
      }),
    );
  }

  @Get('reports/pending')
  listPending(@Query() query: { page?: string; limit?: string }) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_PENDING, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      }),
    );
  }

  @Post('reports/:id/accept')
  async acceptReport(
    @Param('id') id: string,
    @Body() dto: { moderador_id: number; categoria_id?: number; grupo_id?: number },
  ) {
    const result = await sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.ACCEPT_REPORT, {
        report_id: parseInt(id, 10),
        moderador_id: dto.moderador_id,
        categoria_id: dto.categoria_id,
        grupo_id: dto.grupo_id,
      }),
    );
    // Tiempo real: sacar el reporte de las bandejas y refrescar contadores.
    this.events.emitReportResolved(parseInt(id, 10));
    this.events.emitStatsUpdate(null);
    return result;
  }

  @Post('reports/:id/reject')
  async rejectReport(@Param('id') id: string) {
    const result = await sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.REJECT_REPORT, { report_id: parseInt(id, 10) }),
    );
    this.events.emitReportResolved(parseInt(id, 10));
    this.events.emitStatsUpdate(null);
    return result;
  }

  @Post('groups')
  async createGroup(@Body() dto: { report_ids: number[]; creado_por_usuario_id: number }) {
    const result = await sendRpc(this.client.send(TCP_PATTERNS.ADMIN.CREATE_GROUP, dto));
    // Cada reporte agrupado sale de las bandejas de todos los moderadores.
    dto.report_ids.forEach((rid) => this.events.emitReportResolved(rid));
    this.events.emitStatsUpdate(null);
    return result;
  }

  @Post('groups/:id/updates')
  updateCase(
    @Param('id') id: string,
    @Body()
    dto: {
      usuario_id: number;
      comentario: string;
      estado_nuevo?: string;
      recursos_solicitados?: string;
      fecha_estimada_fin?: string;
      lat_actualizada?: number;
      lng_actualizada?: number;
      url_imagen?: string;
    },
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.UPDATE_CASE, {
        grupo_id: parseInt(id, 10),
        ...dto,
      }),
    );
  }

  @Post('devices/ban')
  banDevice(@Body() dto: { device_id: string; motivo?: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.BAN_DEVICE, dto));
  }

  @Post('devices/unban')
  unbanDevice(@Body() dto: { device_id: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.UNBAN_DEVICE, dto));
  }

  @Get('groups/heatmap')
  getGroupsHeatmap(
    @Query('resolution') resolution?: string,
    @Query('solo_activos') soloActivos?: string,
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.GET_GROUPS_HEATMAP, {
        resolution: resolution ? parseInt(resolution, 10) : undefined,
        solo_activos: soloActivos !== 'false',
      }),
    );
  }

  @Get('groups/by-cell')
  listGroupsByCell(@Query() q: { h3_cell: string; h3_resolution?: string; solo_activos?: string }) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_GROUPS_BY_CELL, {
        h3_cell: q.h3_cell,
        h3_resolution: q.h3_resolution ? parseInt(q.h3_resolution, 10) : 8,
        solo_activos: q.solo_activos !== 'false',
      }),
    );
  }

  @Get('groups')
  listGroups(@Query() query: { page?: string; limit?: string; estado?: string }) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_GROUPS, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        estado: query.estado || undefined,
      }),
    );
  }

  @Get('groups/:id')
  getGroup(@Param('id') id: string) {
    return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.GET_GROUP, { grupo_id: parseInt(id, 10) }));
  }

  @Get('groups/:id/timeline')
  getTimeline(@Param('id') id: string) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.GET_CASE_TIMELINE, { grupo_id: parseInt(id, 10) }),
    );
  }

  @Get('groups/:id/reports')
  listGroupReports(@Param('id') id: string) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_GROUP_REPORTS, {
        grupo_id: parseInt(id, 10),
      }),
    );
  }

  @Get('dashboard')
  getDashboard() {
    return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.DASHBOARD, {}));
  }

  @Get('dashboard/kpis')
  getDashboardKpis() {
    return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.DASHBOARD_KPIS, {}));
  }

  @Get('devices')
  listDevices(@Query() query: { page?: string; limit?: string; banned_only?: string }) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.ADMIN.LIST_DEVICES, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        banned_only: query.banned_only === 'true',
      }),
    );
  }
}

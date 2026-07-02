import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { AdminService } from './admin.service';
import { CreateGroupDto, UpdateCaseDto, AcceptReportDto, BanDeviceDto } from './dto';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern(TCP_PATTERNS.ADMIN.PING)
  ping() {
    return { status: 'ok', service: 'ms-admin' };
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_PENDING)
  listPending(@Payload() dto: { page?: number; limit?: number }) {
    return this.adminService.listPending(dto.page, dto.limit);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.ACCEPT_REPORT)
  acceptReport(@Payload() dto: AcceptReportDto) {
    return this.adminService.acceptReport(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.REJECT_REPORT)
  rejectReport(@Payload() dto: { report_id: number }) {
    return this.adminService.rejectReport(dto.report_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.BAN_DEVICE)
  banDevice(@Payload() dto: BanDeviceDto) {
    return this.adminService.banDevice(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.CREATE_GROUP)
  createGroup(@Payload() dto: CreateGroupDto) {
    return this.adminService.createGroup(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.UPDATE_CASE)
  updateCase(@Payload() dto: UpdateCaseDto) {
    return this.adminService.updateCase(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_GROUP)
  getGroup(@Payload() dto: { grupo_id: number }) {
    return this.adminService.getGroup(dto.grupo_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GROUPS)
  listGroups(@Payload() dto: { page?: number; limit?: number; estado?: string }) {
    return this.adminService.listGroups(dto.page, dto.limit, dto.estado);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_CASE_TIMELINE)
  getCaseTimeline(@Payload() dto: { grupo_id: number }) {
    return this.adminService.getCaseTimeline(dto.grupo_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GROUPS_BY_CELL)
  listGroupsByCell(
    @Payload() dto: { h3_cell: string; h3_resolution: number; solo_activos?: boolean },
  ) {
    return this.adminService.listGroupsByCell(dto.h3_cell, dto.h3_resolution, dto.solo_activos);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_GROUPS_HEATMAP)
  getGroupsHeatmap(@Payload() dto: { resolution?: number; solo_activos?: boolean }) {
    return this.adminService.getGroupsHeatmap(dto.resolution, dto.solo_activos);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.DASHBOARD)
  dashboard() {
    return this.adminService.getDashboard();
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.DASHBOARD_KPIS)
  dashboardKpis(
    @Payload()
    dto: {
      desde?: string;
      hasta?: string;
      granularidad?: string;
      estado_in?: string;
      estado_out?: string;
      categoria_in?: string;
      categoria_out?: string;
    },
  ) {
    return this.adminService.getDashboardKpis(
      dto?.desde,
      dto?.hasta,
      dto?.granularidad as 'mes' | 'semana' | 'dia' | undefined,
      dto?.estado_in,
      dto?.estado_out,
      dto?.categoria_in,
      dto?.categoria_out,
    );
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_DEVICES)
  listDevices(@Payload() dto: { page?: number; limit?: number; banned_only?: boolean }) {
    return this.adminService.listDevices(dto.page, dto.limit, dto.banned_only);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GROUP_REPORTS)
  listGroupReports(@Payload() dto: { grupo_id: number }) {
    return this.adminService.listGroupReports(dto.grupo_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_NEARBY_REPORTS)
  listNearbyReports(@Payload() dto: { lat: number; lng: number; radius?: number }) {
    return this.adminService.listNearbyReports(dto.lat, dto.lng, dto.radius);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.UNBAN_DEVICE)
  unbanDevice(@Payload() dto: { device_id: string }) {
    return this.adminService.unbanDevice(dto.device_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_UPDATE_IMAGEN)
  async getUpdateImagen(@Payload() actualizacionId: number) {
    const { buffer, contentType } = await this.adminService.getActualizacionImagen(actualizacionId);
    return { data: buffer.toString('base64'), contentType };
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GROUPS_NEARBY)
  listNearbyGroups(@Payload() dto: { lat: number; lng: number; radius?: number }) {
    return this.adminService.listNearbyGroups(dto.lat, dto.lng, dto.radius);
  }
}

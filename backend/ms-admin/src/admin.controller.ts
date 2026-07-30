import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EstadoCaso, TCP_PATTERNS } from '@ojo-camba/common';
import { AdminService } from './admin.service';
import { OperacionService } from './operacion.service';
import {
  CreateGroupDto,
  UpdateCaseDto,
  AcceptReportDto,
  BanDeviceDto,
  CreateCuadrillaDto,
  UpdateCuadrillaDto,
  AsignarCuadrillaDto,
} from './dto';

@Controller()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly operacionService: OperacionService,
  ) {}

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
  listGroups(
    @Payload()
    dto: {
      page?: number;
      limit?: number;
      estado?: string;
      ficha?: string;
      desde?: string;
      hasta?: string;
      orden?: 'recientes' | 'antiguos';
    },
  ) {
    return this.adminService.listGroups(dto.page, dto.limit, dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_CASE_TIMELINE)
  getCaseTimeline(@Payload() dto: { grupo_id: number }) {
    return this.adminService.getCaseTimeline(dto.grupo_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GROUPS_BY_CELL)
  listGroupsByCell(
    @Payload()
    dto: {
      h3_cell: string;
      h3_resolution: number;
      solo_activos?: boolean;
      categoria_id?: number;
    },
  ) {
    return this.adminService.listGroupsByCell(
      dto.h3_cell,
      dto.h3_resolution,
      dto.solo_activos,
      dto.categoria_id,
    );
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
  listNearbyReports(
    @Payload() dto: { lat: number; lng: number; radius?: number; categoria_id?: number },
  ) {
    return this.adminService.listNearbyReports(dto.lat, dto.lng, dto.radius, dto.categoria_id);
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

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_ESPECIALIDADES)
  listEspecialidades() {
    return this.adminService.listEspecialidades();
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_CUADRILLAS)
  listCuadrillas(@Payload() dto: { solo_activas?: boolean }) {
    return this.adminService.listCuadrillas(dto?.solo_activas);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.CREATE_CUADRILLA)
  createCuadrilla(@Payload() dto: CreateCuadrillaDto) {
    return this.adminService.createCuadrilla(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.UPDATE_CUADRILLA)
  updateCuadrilla(@Payload() dto: UpdateCuadrillaDto) {
    return this.adminService.updateCuadrilla(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.ASIGNAR_CUADRILLA)
  asignarCuadrilla(@Payload() dto: AsignarCuadrillaDto) {
    return this.adminService.asignarCuadrilla(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_GRUPOS_TECNICO)
  listGruposTecnico(@Payload() dto: { usuario_id: number; page?: number; limit?: number }) {
    return this.operacionService.gruposDelTecnico(dto.usuario_id, dto.page, dto.limit);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_GRUPO_TECNICO)
  getGrupoTecnico(@Payload() dto: { grupo_id: number; usuario_id: number }) {
    return this.operacionService.verificarAsignacionTecnica(dto.grupo_id, dto.usuario_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.REGISTRAR_DERIVACION)
  registrarDerivacion(
    @Payload()
    dto: {
      grupo_id: number;
      entidad_destino: string;
      motivo: string;
      evidencia_url: string;
      usuario_id: number;
    },
  ) {
    return this.operacionService.registrarDerivacion(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_CONFIGURACION_OPERATIVA)
  getConfiguracionOperativa() {
    return this.operacionService.getConfiguracion();
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.UPDATE_CONFIGURACION_OPERATIVA)
  updateConfiguracionOperativa(
    @Payload() dto: { clave: string; valor: number; usuario_id: number },
  ) {
    return this.operacionService.actualizarConfiguracion(dto.clave, dto.valor, dto.usuario_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.ASIGNAR_MIEMBRO_CUADRILLA)
  asignarMiembroCuadrilla(
    @Payload() dto: { cuadrilla_id: number; usuario_id: number; es_responsable?: boolean },
  ) {
    return this.operacionService.asignarMiembro(
      dto.cuadrilla_id,
      dto.usuario_id,
      dto.es_responsable,
    );
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_INDICADORES_CUADRILLA)
  indicadoresCuadrilla(@Payload() dto: { cuadrilla_id: number }) {
    return this.operacionService.indicadoresCuadrilla(dto.cuadrilla_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_CONTEXTO_OPERATIVO)
  contextoOperativo(@Payload() dto: { usuario_id: number }) {
    return this.operacionService.contextoOperativo(dto.usuario_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_VISITAS_TECNICO)
  visitasDelTecnico(
    @Payload() dto: { usuario_id: number; page?: number; limit?: number; fecha?: string },
  ) {
    return this.operacionService.visitasDelTecnico(dto.usuario_id, dto.page, dto.limit, dto.fecha);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.LIST_VISITAS_CUADRILLA)
  visitasDeCuadrilla(@Payload() dto: { usuario_id: number; page?: number; limit?: number }) {
    return this.operacionService.visitasDeCuadrillaResponsable(dto.usuario_id, dto.page, dto.limit);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_VISITA_TECNICO)
  detalleVisitaTecnico(@Payload() dto: { visita_id: number; usuario_id: number }) {
    return this.operacionService.detalleVisitaParaTecnico(dto.visita_id, dto.usuario_id);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.ASIGNAR_VISITA_TECNICO)
  asignarVisitaTecnico(
    @Payload()
    dto: {
      visita_id: number;
      responsable_id: number;
      tecnico_id: number;
      fecha_planificada: string;
      orden_ruta: number;
      motivo?: string;
    },
  ) {
    return this.operacionService.asignarVisitaTecnico(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.REGISTRAR_LLEGADA_VISITA)
  registrarLlegadaVisita(
    @Payload() dto: { visita_id: number; tecnico_id: number; lat: number; lng: number },
  ) {
    return this.operacionService.registrarLlegada(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.PROPONER_RESULTADO_VISITA)
  proponerResultadoVisita(
    @Payload()
    dto: {
      visita_id: number;
      tecnico_id: number;
      estado_propuesto: EstadoCaso;
      comentario: string;
      evidencia_url?: string;
      entidad_destino?: string;
      categoria_rechazo_id?: number;
    },
  ) {
    return this.operacionService.proponerResultadoVisita(dto);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.CONFIRMAR_PROPUESTA_VISITA)
  confirmarPropuestaVisita(
    @Payload() dto: { propuesta_id: number; usuario_id: number; motivo_decision?: string },
  ) {
    return this.operacionService.confirmarPropuestaVisita(dto);
  }
}

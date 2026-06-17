import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { AdminService } from './admin.service';
import {
  CreateGroupDto,
  UpdateCaseDto,
  AcceptReportDto,
  BanDeviceDto,
} from './dto';

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
  listGroups(@Payload() dto: { page?: number; limit?: number }) {
    return this.adminService.listGroups(dto.page, dto.limit);
  }

  @MessagePattern(TCP_PATTERNS.ADMIN.GET_CASE_TIMELINE)
  getCaseTimeline(@Payload() dto: { grupo_id: number }) {
    return this.adminService.getCaseTimeline(dto.grupo_id);
  }
}

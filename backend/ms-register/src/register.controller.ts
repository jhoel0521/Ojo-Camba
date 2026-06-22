import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { RegisterService } from './register.service';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { ListReportesDto } from './dto/list-reportes.dto';
import { HeatmapDto } from './dto/heatmap.dto';

@Controller()
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @MessagePattern(TCP_PATTERNS.REGISTER.PING)
  ping() {
    return { status: 'ok', service: 'ms-register' };
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.CREATE_REPORT)
  create(@Payload() dto: CreateReporteDto) {
    return this.registerService.create(dto);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.GET_REPORT)
  getReport(@Payload() dto: { report_id: number }) {
    return this.registerService.findById(dto.report_id);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.LIST_REPORTS)
  listReports(@Payload() dto: ListReportesDto) {
    return this.registerService.list(dto);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.GET_HEATMAP)
  getHeatmap(@Payload() dto: HeatmapDto) {
    return this.registerService.heatmap(dto.resolution);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.GET_HEATMAP_DETAILED)
  getHeatmapDetailed(@Payload() dto: { resolution?: number; solo_activos?: boolean }) {
    return this.registerService.heatmapDetailed(dto.resolution, dto.solo_activos);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.VINCULAR_DEVICE)
  vincularDevice(@Payload() dto: { usuario_id: number; device_id: string }) {
    return this.registerService.vincularDevice(dto.usuario_id, dto.device_id);
  }

  @MessagePattern(TCP_PATTERNS.REGISTER.GET_IMAGEN)
  async getImagen(@Payload() reporteId: number) {
    const { buffer, contentType } = await this.registerService.getImagenById(reporteId);
    return { data: buffer.toString('base64'), contentType };
  }
}

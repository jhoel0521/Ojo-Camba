import { Controller, Post, Get, Body, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { sendRpc } from './rpc.helper';

@Controller('reportes')
export class ReportesController {
  constructor(@Inject('MS_REGISTER') private readonly client: ClientProxy) {}

  @Post()
  create(
    @Body()
    dto: {
      device_id: string;
      lat: number;
      lng: number;
      categoria_id: number;
      gravedad?: string;
      imagen_base64?: string;
      usuario_id?: number;
    },
  ) {
    return sendRpc(this.client.send(TCP_PATTERNS.REGISTER.CREATE_REPORT, dto));
  }

  @Get()
  list(
    @Query()
    query: {
      page?: string;
      limit?: string;
      estado?: string;
      categoria_id?: string;
      h3_res_8?: string;
      device_id?: string;
      usuario_id?: string;
      h3_cell?: string;
      h3_resolution?: string;
      grupo_id?: string;
    },
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.REGISTER.LIST_REPORTS, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        estado: query.estado,
        categoria_id: query.categoria_id ? parseInt(query.categoria_id, 10) : undefined,
        h3_res_8: query.h3_res_8,
        device_id: query.device_id,
        usuario_id: query.usuario_id ? parseInt(query.usuario_id, 10) : undefined,
        h3_cell: query.h3_cell,
        h3_resolution: query.h3_resolution ? parseInt(query.h3_resolution, 10) : undefined,
        grupo_id: query.grupo_id ? parseInt(query.grupo_id, 10) : undefined,
      }),
    );
  }

  @Get('heatmap')
  heatmap(@Query('resolution') resolution?: string) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.REGISTER.GET_HEATMAP, {
        resolution: resolution ? parseInt(resolution, 10) : undefined,
      }),
    );
  }

  @Get('heatmap-detailed')
  heatmapDetailed(
    @Query('resolution') resolution?: string,
    @Query('solo_activos') soloActivos?: string,
  ) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.REGISTER.GET_HEATMAP_DETAILED, {
        resolution: resolution ? parseInt(resolution, 10) : undefined,
        solo_activos: soloActivos !== 'false',
      }),
    );
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return sendRpc(
      this.client.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: parseInt(id, 10) }),
    );
  }

  @Post('vincular')
  vincular(@Body() dto: { usuario_id: number; device_id: string }) {
    return sendRpc(this.client.send(TCP_PATTERNS.REGISTER.VINCULAR_DEVICE, dto));
  }
}

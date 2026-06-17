import { Controller, Post, Get, Body, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { TCP_PATTERNS } from '@ojo-camba/common';

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
    },
  ) {
    return firstValueFrom(this.client.send(TCP_PATTERNS.REGISTER.CREATE_REPORT, dto));
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
    },
  ) {
    return firstValueFrom(
      this.client.send(TCP_PATTERNS.REGISTER.LIST_REPORTS, {
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        estado: query.estado,
        categoria_id: query.categoria_id ? parseInt(query.categoria_id, 10) : undefined,
        h3_res_8: query.h3_res_8,
      }),
    );
  }

  @Get('heatmap')
  heatmap(@Query('resolution') resolution?: string) {
    return firstValueFrom(
      this.client.send(TCP_PATTERNS.REGISTER.GET_HEATMAP, {
        resolution: resolution ? parseInt(resolution, 10) : undefined,
      }),
    );
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send(TCP_PATTERNS.REGISTER.GET_REPORT, { report_id: parseInt(id, 10) }),
    );
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { StatusService } from './status.service';
import type { StatusResult, ServiceHistory } from './status.service';

@Controller()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gateway-status',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  getStatus(): StatusResult {
    return this.statusService.getStatus();
  }

  @Get('status/history')
  getHistory(@Query('days') days?: string): Promise<ServiceHistory[]> {
    return this.statusService.getHistory(days ? parseInt(days, 10) : undefined);
  }
}

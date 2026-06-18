import { Controller, Get } from '@nestjs/common';
import { StatusService } from './status.service';
import type { StatusResult } from './status.service';

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
}

import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_PATTERNS } from '@ojo-camba/common';
import { GamifyService } from './gamify.service';
import { AwardPointsDto, GetUserStatsDto } from './dto';

@Controller()
export class GamifyController {
  constructor(private readonly gamifyService: GamifyService) {}

  @MessagePattern(TCP_PATTERNS.GAMIFY.PING)
  ping() {
    return { status: 'ok', service: 'ms-gamify' };
  }

  @MessagePattern(TCP_PATTERNS.GAMIFY.AWARD_POINTS)
  awardPoints(@Payload() dto: AwardPointsDto) {
    return this.gamifyService.awardPoints(dto);
  }

  @MessagePattern(TCP_PATTERNS.GAMIFY.GET_USER_STATS)
  getUserStats(@Payload() dto: GetUserStatsDto) {
    return this.gamifyService.getUserStats(dto.user_id);
  }

  @MessagePattern(TCP_PATTERNS.GAMIFY.GET_LEVELS)
  getLevels() {
    return this.gamifyService.getLevels();
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReputationService } from './reputation.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@ApiTags('reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get()
  findLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.reputation.findLeaderboard(query);
  }

  @Get(':wallet')
  findOne(@Param('wallet') wallet: string) {
    return this.reputation.findByWallet(wallet);
  }
}

import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReputationService } from './reputation.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { setTotalCountHeader } from '../common/pagination';

@ApiTags('reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get()
  async findLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [rows, total] = await Promise.all([
      this.reputation.findLeaderboard(query),
      this.reputation.countLeaderboard(),
    ]);
    setTotalCountHeader(res, total);
    return rows;
  }

  @Get(':wallet')
  findOne(@Param('wallet') wallet: string) {
    return this.reputation.findByWallet(wallet);
  }
}

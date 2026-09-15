import { Injectable } from '@nestjs/common';
import { ReputationRepository } from './reputation.repository';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class ReputationService {
  constructor(private readonly reputation: ReputationRepository) {}

  findLeaderboard(query: LeaderboardQueryDto) {
    return this.reputation.findTop(query);
  }

  async findByWallet(wallet: string) {
    const record = await this.reputation.findByWallet(wallet);
    return record ?? { wallet, score: 0, updated_at: null };
  }

  /** Consumed internally by the dispute-resolution cascade — not exposed over HTTP. */
  adjustScore(wallet: string, delta: number) {
    return this.reputation.adjustScore(wallet, delta);
  }
}

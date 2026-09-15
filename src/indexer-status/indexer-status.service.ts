import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexerStatusRepository } from './indexer-status.repository';

const DEFAULT_STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class IndexerStatusService {
  private readonly staleThresholdMs: number;

  constructor(
    private readonly repo: IndexerStatusRepository,
    config: ConfigService,
  ) {
    this.staleThresholdMs =
      Number(config.get<string>('INDEXER_STALE_THRESHOLD_MS')) ||
      DEFAULT_STALE_THRESHOLD_MS;
  }

  async getStatus() {
    const cursor = await this.repo.getCursor();
    if (!cursor) {
      // The row is seeded by the initial migration and never deleted --
      // reaching this means the migration hasn't run, not that the
      // indexer is merely idle.
      throw new NotFoundException('indexer_cursor row not found — has the DB been migrated?');
    }

    const ageMs = Date.now() - cursor.updated_at.getTime();
    return {
      lastLedger: Number(cursor.last_ledger),
      updatedAt: cursor.updated_at,
      stale: ageMs > this.staleThresholdMs,
    };
  }
}

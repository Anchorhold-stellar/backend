import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';

export interface IndexerCursor {
  last_ledger: string;
  updated_at: Date;
}

@Injectable()
export class IndexerStatusRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getCursor(): Promise<IndexerCursor | null> {
    const { rows } = await this.pool.query<IndexerCursor>(
      `SELECT last_ledger, updated_at FROM indexer_cursor WHERE id = 1`,
    );
    return rows[0] ?? null;
  }
}

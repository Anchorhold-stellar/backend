import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';

@Injectable()
export class EscrowRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByWallet(query: ListEscrowsQueryDto) {
    const conditions = ['(renter_wallet = $1 OR host_wallet = $1)'];
    const params: unknown[] = [query.wallet];

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }

    params.push(query.limit, query.offset);

    const { rows } = await this.pool.query(
      `SELECT * FROM escrows WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  }

  async findById(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM escrows WHERE escrow_id = $1`,
      [escrowId],
    );
    return rows[0] ?? null;
  }

  async findMilestones(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM milestones WHERE escrow_id = $1 ORDER BY milestone_index ASC`,
      [escrowId],
    );
    return rows;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';

@Injectable()
export class EscrowRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByWallet(wallet: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM escrows WHERE renter_wallet = $1 OR host_wallet = $1 ORDER BY created_at DESC`,
      [wallet],
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

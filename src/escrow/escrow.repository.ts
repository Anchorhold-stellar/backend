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
    const { rows } = await this.pool.query(`SELECT * FROM escrows WHERE escrow_id = $1`, [
      escrowId,
    ]);
    return rows[0] ?? null;
  }

  async findMilestones(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM milestones WHERE escrow_id = $1 ORDER BY milestone_index ASC`,
      [escrowId],
    );
    return rows;
  }

  async updateStatus(escrowId: string, status: string) {
    const { rows } = await this.pool.query(
      `UPDATE escrows SET status = $2, updated_at = now() WHERE escrow_id = $1 RETURNING *`,
      [escrowId, status],
    );
    return rows[0] ?? null;
  }

  async findDueMilestones() {
    const { rows } = await this.pool.query(
      `SELECT * FROM milestones
       WHERE auto_release_at IS NOT NULL AND auto_release_at <= now() AND released = false`,
    );
    return rows;
  }

  async releaseMilestone(id: string) {
    await this.pool.query(
      `UPDATE milestones SET released = true, released_at = now() WHERE id = $1`,
      [id],
    );
  }

  async allMilestonesReleased(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT count(*) FILTER (WHERE NOT released) AS unreleased
       FROM milestones WHERE escrow_id = $1`,
      [escrowId],
    );
    return Number(rows[0].unreleased) === 0;
  }
}

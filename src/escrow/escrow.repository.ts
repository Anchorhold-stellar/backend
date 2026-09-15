import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';

@Injectable()
export class EscrowRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private buildFilter(query: ListEscrowsQueryDto): { where: string; params: unknown[] } {
    const conditions = ['(renter_wallet = $1 OR host_wallet = $1)'];
    const params: unknown[] = [query.wallet];

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }

    return { where: conditions.join(' AND '), params };
  }

  async findByWallet(query: ListEscrowsQueryDto) {
    const { where, params } = this.buildFilter(query);
    const listParams = [...params, query.limit, query.offset];

    const { rows } = await this.pool.query(
      `SELECT * FROM escrows WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return rows;
  }

  async count(query: ListEscrowsQueryDto): Promise<number> {
    const { where, params } = this.buildFilter(query);
    const { rows } = await this.pool.query(
      `SELECT count(*) FROM escrows WHERE ${where}`,
      params,
    );
    return Number(rows[0].count);
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
    // A milestone under an open (unresolved) dispute must never be
    // auto-released -- that would release funds out from under an active
    // adjudication, defeating the entire point of raising a dispute.
    const { rows } = await this.pool.query(
      `SELECT m.* FROM milestones m
       WHERE m.auto_release_at IS NOT NULL
         AND m.auto_release_at <= now()
         AND m.released = false
         AND NOT EXISTS (
           SELECT 1 FROM disputes d
           WHERE d.escrow_id = m.escrow_id
             AND d.milestone_index = m.milestone_index
             AND d.resolved = false
         )`,
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

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';

@Injectable()
export class DisputesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private buildFilter(query: ListDisputesQueryDto): { where: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.resolved !== undefined) {
      params.push(query.resolved);
      conditions.push(`resolved = $${params.length}`);
    }

    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
  }

  async findAll(query: ListDisputesQueryDto) {
    const { where, params } = this.buildFilter(query);
    const listParams = [...params, query.limit, query.offset];

    const { rows } = await this.pool.query(
      `SELECT * FROM disputes ${where}
       ORDER BY opened_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return rows;
  }

  async count(query: ListDisputesQueryDto): Promise<number> {
    const { where, params } = this.buildFilter(query);
    const { rows } = await this.pool.query(
      `SELECT count(*) FROM disputes ${where}`,
      params,
    );
    return Number(rows[0].count);
  }

  async findOne(escrowId: string, milestoneIndex: number) {
    const { rows } = await this.pool.query(
      `SELECT * FROM disputes WHERE escrow_id = $1 AND milestone_index = $2`,
      [escrowId, milestoneIndex],
    );
    return rows[0] ?? null;
  }

  async findEvidence(escrowId: string, milestoneIndex: number) {
    const { rows } = await this.pool.query(
      `SELECT * FROM dispute_evidence
       WHERE escrow_id = $1 AND milestone_index = $2
       ORDER BY created_at ASC`,
      [escrowId, milestoneIndex],
    );
    return rows;
  }

  async addEvidence(
    escrowId: string,
    milestoneIndex: number,
    submittedBy: string,
    uri: string,
    note: string | null,
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO dispute_evidence (escrow_id, milestone_index, submitted_by, uri, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [escrowId, milestoneIndex, submittedBy, uri, note],
    );
    return rows[0];
  }

  async markResolved(escrowId: string, milestoneIndex: number, outcome: string) {
    const { rows } = await this.pool.query(
      `UPDATE disputes SET resolved = true, outcome = $3, resolved_at = now()
       WHERE escrow_id = $1 AND milestone_index = $2 RETURNING *`,
      [escrowId, milestoneIndex, outcome],
    );
    return rows[0] ?? null;
  }

  async findVotes(escrowId: string, milestoneIndex: number) {
    const { rows } = await this.pool.query(
      `SELECT * FROM votes WHERE escrow_id = $1 AND milestone_index = $2 ORDER BY voted_at ASC`,
      [escrowId, milestoneIndex],
    );
    return rows;
  }

  async recordVote(
    escrowId: number,
    milestoneIndex: number,
    jurorWallet: string,
    voteForRenter: boolean,
  ) {
    // A juror voting again for the same escrow+milestone replaces their
    // earlier vote rather than erroring or duplicating — the
    // UNIQUE(escrow_id, milestone_index, juror_wallet) constraint exists
    // precisely to make that safe.
    await this.pool.query(
      `INSERT INTO votes (escrow_id, milestone_index, juror_wallet, vote_for_renter)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (escrow_id, milestone_index, juror_wallet) DO UPDATE
         SET vote_for_renter = EXCLUDED.vote_for_renter, voted_at = now()`,
      [escrowId, milestoneIndex, jurorWallet, voteForRenter],
    );
  }
}

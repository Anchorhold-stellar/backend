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

  async findByEscrowId(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM disputes WHERE escrow_id = $1`,
      [escrowId],
    );
    return rows[0] ?? null;
  }

  async findEvidence(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM dispute_evidence WHERE escrow_id = $1 ORDER BY created_at ASC`,
      [escrowId],
    );
    return rows;
  }

  async addEvidence(
    escrowId: string,
    submittedBy: string,
    uri: string,
    note: string | null,
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO dispute_evidence (escrow_id, submitted_by, uri, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [escrowId, submittedBy, uri, note],
    );
    return rows[0];
  }

  async markResolved(escrowId: string, outcome: string) {
    const { rows } = await this.pool.query(
      `UPDATE disputes SET resolved = true, outcome = $2, resolved_at = now()
       WHERE escrow_id = $1 RETURNING *`,
      [escrowId, outcome],
    );
    return rows[0] ?? null;
  }

  async findVotes(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM votes WHERE escrow_id = $1 ORDER BY voted_at ASC`,
      [escrowId],
    );
    return rows;
  }

  async recordVote(escrowId: number, jurorWallet: string, voteForRenter: boolean) {
    // A juror voting again for the same escrow replaces their earlier
    // vote rather than erroring or duplicating — the UNIQUE(escrow_id,
    // juror_wallet) constraint exists precisely to make that safe.
    await this.pool.query(
      `INSERT INTO votes (escrow_id, juror_wallet, vote_for_renter)
       VALUES ($1, $2, $3)
       ON CONFLICT (escrow_id, juror_wallet) DO UPDATE
         SET vote_for_renter = EXCLUDED.vote_for_renter, voted_at = now()`,
      [escrowId, jurorWallet, voteForRenter],
    );
  }
}

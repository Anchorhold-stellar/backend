import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';

@Injectable()
export class DisputesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(query: ListDisputesQueryDto) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.resolved !== undefined) {
      params.push(query.resolved);
      conditions.push(`resolved = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const { rows } = await this.pool.query(
      `SELECT * FROM disputes ${where}
       ORDER BY opened_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
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
}

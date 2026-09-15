import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';

@Injectable()
export class DisputesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

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
}

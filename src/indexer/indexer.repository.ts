import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';

@Injectable()
export class IndexerRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getLastLedger(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT last_ledger FROM indexer_cursor WHERE id = 1`,
    );
    return Number(rows[0]?.last_ledger ?? 0);
  }

  async setLastLedger(ledger: number): Promise<void> {
    await this.pool.query(
      `UPDATE indexer_cursor SET last_ledger = $1, updated_at = now() WHERE id = 1`,
      [ledger],
    );
  }

  async createEscrow(
    escrowId: number,
    renter: string,
    host: string,
    asset: string,
    totalAmount: string,
  ) {
    await this.pool.query(
      `INSERT INTO escrows (escrow_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'created')
       ON CONFLICT (escrow_id) DO NOTHING`,
      [escrowId, renter, host, asset, totalAmount],
    );
  }

  async fundEscrow(escrowId: number) {
    await this.pool.query(
      `UPDATE escrows SET status = 'active', updated_at = now() WHERE escrow_id = $1`,
      [escrowId],
    );
  }

  async releaseMilestone(escrowId: number, milestoneIndex: number) {
    await this.pool.query(
      `UPDATE milestones SET released = true, released_at = now()
       WHERE escrow_id = $1 AND milestone_index = $2`,
      [escrowId, milestoneIndex],
    );
  }

  async completeEscrow(escrowId: number) {
    await this.pool.query(
      `UPDATE escrows SET status = 'completed', updated_at = now() WHERE escrow_id = $1`,
      [escrowId],
    );
  }

  async openDispute(
    escrowId: number,
    milestoneIndex: number,
    openedBy: string,
    evidenceUri: string,
  ) {
    await this.pool.query(
      `INSERT INTO disputes (escrow_id, milestone_index, opened_by_wallet, evidence_uri)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (escrow_id) DO NOTHING`,
      [escrowId, milestoneIndex, openedBy, evidenceUri],
    );
  }
}

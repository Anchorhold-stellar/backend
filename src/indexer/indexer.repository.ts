import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { MilestoneDefinition } from './chain-event';

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
    milestones: MilestoneDefinition[],
    listingId: string | null = null,
  ) {
    await this.pool.query(
      `INSERT INTO escrows (escrow_id, listing_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'created')
       ON CONFLICT (escrow_id) DO NOTHING`,
      [escrowId, listingId, renter, host, asset, totalAmount],
    );

    // Without this, the milestones table never gets a row for this escrow
    // at all -- GET /escrows/:id would report milestones: [] forever, the
    // auto-release cron would never find anything to release, and a
    // later milestone_released event would silently UPDATE zero rows.
    for (const milestone of milestones) {
      await this.pool.query(
        `INSERT INTO milestones (escrow_id, milestone_index, description, amount, auto_release_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (escrow_id, milestone_index) DO NOTHING`,
        [
          escrowId,
          milestone.index,
          milestone.description,
          milestone.amount,
          milestone.autoReleaseAt ?? null,
        ],
      );
    }
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
    // Composite conflict target: an escrow can have several milestones,
    // each with its own dispute over the escrow's lifetime. Conflicting
    // only on escrow_id would silently drop a genuinely new dispute on a
    // different milestone once any dispute (even a resolved one) already
    // existed for this escrow.
    await this.pool.query(
      `INSERT INTO disputes (escrow_id, milestone_index, opened_by_wallet, evidence_uri)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (escrow_id, milestone_index) DO NOTHING`,
      [escrowId, milestoneIndex, openedBy, evidenceUri],
    );
  }
}

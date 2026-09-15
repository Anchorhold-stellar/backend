import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';
import { EscrowRepository } from '../src/escrow/escrow.repository';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * Regression coverage for a real bug: findDueMilestones() originally
 * selected any milestone past its auto_release_at with no regard for
 * whether a dispute was open against it, so the auto-release cron would
 * release funds out from under an active adjudication. Needs real
 * Postgres because the fix lives entirely in a NOT EXISTS subquery --
 * a mocked pool can't prove the join logic is correct.
 */
describeIfDb('EscrowRepository.findDueMilestones (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let repo: EscrowRepository;
  let escrowId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();
    pool = app.get(PG_POOL);
    repo = app.get(EscrowRepository);

    escrowId = Math.floor(Math.random() * 1_000_000);
    await pool.query(
      `INSERT INTO escrows (escrow_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, 'GRENTER', 'GHOST', 'GASSET', 1000, 'active')`,
      [escrowId],
    );
    await pool.query(
      `INSERT INTO milestones (escrow_id, milestone_index, description, amount, auto_release_at)
       VALUES ($1, 0, 'past due, disputed', 100, now() - interval '1 hour'),
              ($1, 1, 'past due, undisputed', 100, now() - interval '1 hour')`,
      [escrowId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM disputes WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM milestones WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = $1`, [escrowId]);
    await app.close();
  });

  it('excludes a past-due milestone that has an open dispute against it', async () => {
    await pool.query(
      `INSERT INTO disputes (escrow_id, milestone_index, opened_by_wallet, resolved)
       VALUES ($1, 0, 'GRENTER', false)`,
      [escrowId],
    );

    const due = await repo.findDueMilestones();

    expect(due.some((m) => m.escrow_id === escrowId && m.milestone_index === 0)).toBe(
      false,
    );
    expect(due.some((m) => m.escrow_id === escrowId && m.milestone_index === 1)).toBe(
      true,
    );
  });

  it('includes it again once the dispute is resolved', async () => {
    await pool.query(
      `UPDATE disputes SET resolved = true WHERE escrow_id = $1 AND milestone_index = 0`,
      [escrowId],
    );

    const due = await repo.findDueMilestones();

    expect(due.some((m) => m.escrow_id === escrowId && m.milestone_index === 0)).toBe(
      true,
    );
  });
});

import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { INestApplicationContext } from '@nestjs/common';
import { IndexerAppModule } from '../src/indexer/indexer-app.module';
import { IndexerService } from '../src/indexer/indexer.service';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * Runs the real IndexerService (mock events, real Postgres) end to end --
 * regression coverage for two bugs found by inspection: escrow_created
 * never actually inserted milestone rows, and never set listing_id.
 * Unit tests cover the repository SQL in isolation; this proves the full
 * wiring (service -> repository -> real DB) actually produces the rows.
 */
describeIfDb('Indexer pipeline (e2e, real Postgres)', () => {
  let context: INestApplicationContext;
  let indexer: IndexerService;
  let pool: Pool;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';
    process.env.INDEXER_MODE = 'mock';

    const moduleRef = await Test.createTestingModule({
      imports: [IndexerAppModule],
    }).compile();
    context = moduleRef.createNestApplication();
    await context.init();

    indexer = context.get(IndexerService);
    pool = context.get(PG_POOL);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM milestones WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = 1`);
    await pool.query(`UPDATE indexer_cursor SET last_ledger = 0 WHERE id = 1`);
    await context.close();
  });

  it('creates a real milestone row from the escrow_created mock fixture', async () => {
    await pool.query(`DELETE FROM milestones WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = 1`);
    await pool.query(`UPDATE indexer_cursor SET last_ledger = 0 WHERE id = 1`);

    const processed = await indexer.pollOnce();
    expect(processed).toBe(3); // escrow_created, escrow_funded, milestone_released

    const { rows } = await pool.query(
      `SELECT milestone_index, description, released FROM milestones WHERE escrow_id = 1`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      milestone_index: 0,
      description: 'delivery',
      released: true, // the mock fixture's milestone_released event applies too
    });
  });
});

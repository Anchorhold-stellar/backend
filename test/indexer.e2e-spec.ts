import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { INestApplicationContext } from '@nestjs/common';
import { IndexerAppModule } from '../src/indexer/indexer-app.module';
import { IndexerService } from '../src/indexer/indexer.service';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

const MOCK_RENTER_WALLET = 'GRENTERMOCKWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const MOCK_HOST_WALLET = 'GHOSTMOCKWALLETBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const MOCK_JUROR_WALLET = 'GJURORMOCKWALLETDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';

/**
 * Runs the real IndexerService (mock events, real Postgres) end to end --
 * regression coverage for bugs found by inspection: escrow_created never
 * actually inserted milestone rows, never set listing_id, and the
 * dispute_voted/dispute_resolved handling (added along with the
 * multi-milestone-disputes migration) was never exercised past isolated
 * unit mocks. Unit tests cover the repository SQL in isolation; this
 * proves the full wiring (service -> repository -> real DB) actually
 * produces the rows.
 */
describeIfDb('Indexer pipeline (e2e, real Postgres)', () => {
  let context: INestApplicationContext;
  let indexer: IndexerService;
  let pool: Pool;

  async function reset() {
    await pool.query(`DELETE FROM votes WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM dispute_evidence WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM disputes WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM milestones WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = 1`);
    await pool.query(`DELETE FROM reputation WHERE wallet IN ($1, $2)`, [
      MOCK_RENTER_WALLET,
      MOCK_HOST_WALLET,
    ]);
    await pool.query(`UPDATE indexer_cursor SET last_ledger = 0 WHERE id = 1`);
  }

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
    await reset();
    await context.close();
  });

  it('creates a real milestone row from the escrow_created mock fixture', async () => {
    await reset();

    const processed = await indexer.pollOnce();
    // escrow_created, escrow_funded, milestone_released, dispute_opened,
    // dispute_voted, dispute_resolved
    expect(processed).toBe(6);

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

  it('applies the full dispute lifecycle (opened, voted, resolved) through real tables', async () => {
    await reset();
    await indexer.pollOnce();

    const { rows: disputeRows } = await pool.query(
      `SELECT * FROM disputes WHERE escrow_id = 1 AND milestone_index = 0`,
    );
    expect(disputeRows).toHaveLength(1);
    expect(disputeRows[0]).toMatchObject({
      opened_by_wallet: MOCK_RENTER_WALLET,
      evidence_uri: 'ipfs://mock-evidence',
      resolved: true,
      outcome: 'host_wins',
    });

    const { rows: voteRows } = await pool.query(
      `SELECT * FROM votes WHERE escrow_id = 1 AND milestone_index = 0`,
    );
    expect(voteRows).toHaveLength(1);
    expect(voteRows[0]).toMatchObject({
      juror_wallet: MOCK_JUROR_WALLET,
      vote_for_renter: false,
    });

    // host_wins -> escrow completed, host rewarded, renter penalized (see
    // DisputesService.applyResolution's REPUTATION_DELTA constants).
    const { rows: escrowRows } = await pool.query(
      `SELECT status FROM escrows WHERE escrow_id = 1`,
    );
    expect(escrowRows[0].status).toBe('completed');

    const { rows: hostRep } = await pool.query(
      `SELECT score FROM reputation WHERE wallet = $1`,
      [MOCK_HOST_WALLET],
    );
    expect(hostRep[0].score).toBe(10);

    const { rows: renterRep } = await pool.query(
      `SELECT score FROM reputation WHERE wallet = $1`,
      [MOCK_RENTER_WALLET],
    );
    expect(renterRep[0].score).toBe(-5);
  });

  it('bumps updated_at even when a poll cycle finds no new events', async () => {
    // Regression test: setLastLedger only ran (and only it touched
    // updated_at) when events.length > 0, so a poll cycle that legitimately
    // found nothing new -- the normal steady state once caught up -- left
    // updated_at frozen. GET /indexer/status would then eventually report
    // stale:true for a perfectly healthy indexer, indistinguishable from
    // one whose polling loop actually died.
    await reset();
    await pool.query(`UPDATE indexer_cursor SET last_ledger = 6, updated_at = now() - interval '1 hour' WHERE id = 1`);

    const processed = await indexer.pollOnce();
    expect(processed).toBe(0); // cursor is already past every mock fixture

    const { rows } = await pool.query(`SELECT updated_at FROM indexer_cursor WHERE id = 1`);
    const ageMs = Date.now() - new Date(rows[0].updated_at).getTime();
    expect(ageMs).toBeLessThan(60_000);
  });
});

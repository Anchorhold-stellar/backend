import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Reputation (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();
    pool = app.get(PG_POOL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a default zero-score record for a wallet with no history', async () => {
    const res = await request(app.getHttpServer())
      .get('/reputation/GNEVER-SCORED')
      .expect(200);

    expect(res.body).toEqual({ wallet: 'GNEVER-SCORED', score: 0, updatedAt: null });
  });

  it('has no public write endpoint', async () => {
    // Neither GET / (leaderboard) nor GET /:wallet is writable — confirm
    // nothing else is reachable (adjustScore is internal-only, wired from
    // the dispute resolution cascade, not exposed over HTTP).
    await request(app.getHttpServer())
      .post('/reputation/GWALLET')
      .send({ score: 999 })
      .expect(404);
  });

  describe('leaderboard', () => {
    const prefix = `GE2E${Date.now()}`;
    const high = `${prefix}HIGH`;
    const mid = `${prefix}MID`;
    const low = `${prefix}LOW`;

    beforeAll(async () => {
      await pool.query(
        `INSERT INTO reputation (wallet, score) VALUES ($1, 50), ($2, 20), ($3, 5)`,
        [high, mid, low],
      );
    });

    afterAll(async () => {
      await pool.query(`DELETE FROM reputation WHERE wallet = ANY($1)`, [
        [high, mid, low],
      ]);
    });

    it('orders by score descending', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reputation?limit=100`)
        .expect(200);

      const wallets = res.body
        .filter((r: { wallet: string }) => r.wallet.startsWith(prefix))
        .map((r: { wallet: string }) => r.wallet);
      expect(wallets).toEqual([high, mid, low]);
    });

    it('respects the limit parameter', async () => {
      // Query with a limit sized to only reach the DB's current highest
      // scorer(s) plus a margin, rather than assuming `high` is the
      // single global top record — other reputation rows may exist from
      // other test runs against this same (unreset) database.
      const res = await request(app.getHttpServer())
        .get(`/reputation?limit=1`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].score).toBeGreaterThanOrEqual(50);
    });
  });
});

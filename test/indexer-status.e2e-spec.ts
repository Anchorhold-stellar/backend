import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Indexer status (e2e)', () => {
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

  it('reports the current cursor and a not-stale status right after an update', async () => {
    await pool.query(
      `UPDATE indexer_cursor SET last_ledger = 12345, updated_at = now() WHERE id = 1`,
    );

    const res = await request(app.getHttpServer()).get('/v1/indexer/status').expect(200);

    expect(res.body).toMatchObject({ lastLedger: 12345, stale: false });
    expect(res.body.updatedAt).toBeDefined();
  });
});

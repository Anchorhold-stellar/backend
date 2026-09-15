import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createHmac } from 'crypto';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
const SECRET = 'e2e-test-secret';

function sign(body: Record<string, unknown>) {
  const raw = JSON.stringify(body);
  return 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex');
}

describeIfDb('Webhooks (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let escrowId: number;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';
    process.env.KEEPER_WEBHOOK_SECRET = SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    applyGlobalMiddleware(app);
    await app.init();
    pool = app.get(PG_POOL);

    escrowId = Math.floor(Math.random() * 1_000_000);
    await pool.query(
      `INSERT INTO escrows (escrow_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, 'GRENTER', 'GHOST', 'GASSET', 1000, 'active')`,
      [escrowId],
    );
    await pool.query(
      `INSERT INTO milestones (escrow_id, milestone_index, description, amount)
       VALUES ($1, 0, 'only milestone', 1000)`,
      [escrowId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM milestones WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = $1`, [escrowId]);
    await app.close();
  });

  it('rejects a keeper-ping with no signature header', async () => {
    await request(app.getHttpServer())
      .post('/v1/webhooks/keeper-ping')
      .send({ escrowId, milestoneIndex: 0 })
      .expect(401);
  });

  it('rejects a keeper-ping with an invalid signature', async () => {
    await request(app.getHttpServer())
      .post('/v1/webhooks/keeper-ping')
      .set('X-Keeper-Signature', 'sha256=' + '0'.repeat(64))
      .send({ escrowId, milestoneIndex: 0 })
      .expect(401);
  });

  it('accepts a keeper-ping with a valid signature, and completes the escrow once its only milestone is released', async () => {
    const body = { escrowId, milestoneIndex: 0 };
    await request(app.getHttpServer())
      .post('/v1/webhooks/keeper-ping')
      .set('X-Keeper-Signature', sign(body))
      .send(body)
      .expect(204);

    const { rows: milestoneRows } = await pool.query(
      `SELECT released FROM milestones WHERE escrow_id = $1 AND milestone_index = 0`,
      [escrowId],
    );
    expect(milestoneRows[0].released).toBe(true);

    const { rows: escrowRows } = await pool.query(
      `SELECT status FROM escrows WHERE escrow_id = $1`,
      [escrowId],
    );
    expect(escrowRows[0].status).toBe('completed');
  });
});

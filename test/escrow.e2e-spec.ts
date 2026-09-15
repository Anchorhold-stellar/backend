import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { Keypair } from '@stellar/stellar-sdk';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Escrow cancellation (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let createdEscrowId: number;
  let activeEscrowId: number;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();
    pool = app.get(PG_POOL);

    createdEscrowId = Math.floor(Math.random() * 1_000_000);
    activeEscrowId = createdEscrowId + 1;
    await pool.query(
      `INSERT INTO escrows (escrow_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, 'GRENTER', 'GHOST', 'GASSET', 1000, 'created'),
              ($2, 'GRENTER', 'GHOST', 'GASSET', 1000, 'active')`,
      [createdEscrowId, activeEscrowId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM escrows WHERE escrow_id IN ($1, $2)`, [
      createdEscrowId,
      activeEscrowId,
    ]);
    await app.close();
  });

  async function authHeaders(kp: Keypair) {
    const challengeRes = await request(app.getHttpServer())
      .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');
    return { 'X-Wallet-Address': kp.publicKey(), 'X-Wallet-Signature': signature };
  }

  it('400s for a non-numeric escrowId in the path instead of a raw DB error', async () => {
    await request(app.getHttpServer()).get('/v1/escrows/not-a-number').expect(400);
  });

  it('rejects cancellation without wallet auth', async () => {
    await request(app.getHttpServer())
      .post('/v1/escrows/build/cancel')
      .send({ renterWallet: 'GRENTER', escrowId: createdEscrowId })
      .expect(401);
  });

  it('404s for an escrow that does not exist', async () => {
    const kp = Keypair.random();
    await request(app.getHttpServer())
      .post('/v1/escrows/build/cancel')
      .set(await authHeaders(kp))
      .send({ renterWallet: kp.publicKey(), escrowId: 999999999 })
      .expect(404);
  });

  it('rejects cancelling an escrow that is no longer in created status', async () => {
    const kp = Keypair.random();
    const res = await request(app.getHttpServer())
      .post('/v1/escrows/build/cancel')
      .set(await authHeaders(kp))
      .send({ renterWallet: kp.publicKey(), escrowId: activeEscrowId })
      .expect(400);

    expect(res.body.message).toMatch(/cannot be cancelled/);
  });
});

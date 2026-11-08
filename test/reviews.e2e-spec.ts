import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { Keypair } from '@stellar/stellar-sdk';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

/**
 * Requires a live Postgres reachable at DATABASE_URL with migrations
 * applied — see listings.e2e-spec.ts for the same setup contract.
 * Skipped (not failed) when DATABASE_URL isn't set.
 */
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

async function authHeaders(app: INestApplication, kp: Keypair) {
  const challengeRes = await request(app.getHttpServer())
    .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
    .expect(200);
  const signature = kp
    .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
    .toString('base64');
  return { 'X-Wallet-Address': kp.publicKey(), 'X-Wallet-Signature': signature };
}

describeIfDb('Reviews (e2e)', () => {
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

  async function seedCompletedEscrow(escrowId: number, renter: string, host: string) {
    const { rows } = await pool.query(`SELECT id FROM listings LIMIT 1`);
    let listingId: string = rows[0]?.id;
    if (!listingId) {
      const created = await pool.query(
        `INSERT INTO listings (host_wallet, title) VALUES ($1, 'review fixture') RETURNING id`,
        [host],
      );
      listingId = created.rows[0].id;
    }
    await pool.query(
      `INSERT INTO escrows (escrow_id, listing_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, $2, $3, $4, 'GASSET', 100, 'completed')
       ON CONFLICT (escrow_id) DO UPDATE SET status = 'completed'`,
      [escrowId, listingId, renter, host],
    );
    await pool.query(`DELETE FROM reviews WHERE escrow_id = $1`, [escrowId]);
  }

  it('rejects review creation without wallet auth', async () => {
    await request(app.getHttpServer())
      .post('/v1/reviews/escrow/1')
      .send({ revieweeWallet: 'GHOST', rating: 5 })
      .expect(401);
  });

  it('submits one review per side, then blocks duplicates', async () => {
    const renter = Keypair.random();
    const host = Keypair.random();
    const escrowId = 900001 + Math.floor(Math.random() * 899999);
    await seedCompletedEscrow(escrowId, renter.publicKey(), host.publicKey());

    await request(app.getHttpServer())
      .post(`/v1/reviews/escrow/${escrowId}`)
      .set(await authHeaders(app, renter))
      .send({ revieweeWallet: host.publicKey(), rating: 5, comment: 'smooth deal' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/reviews/escrow/${escrowId}`)
      .set(await authHeaders(app, renter))
      .send({ revieweeWallet: host.publicKey(), rating: 4 })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/v1/reviews/escrow/${escrowId}`)
      .set(await authHeaders(app, host))
      .send({ revieweeWallet: renter.publicKey(), rating: 4 })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get(`/v1/reviews/escrow/${escrowId}`)
      .expect(200);
    expect(listRes.body).toHaveLength(2);

    const summaryRes = await request(app.getHttpServer())
      .get(`/v1/reviews/summary/${host.publicKey()}`)
      .expect(200);
    expect(summaryRes.body.reviewCount).toBeGreaterThanOrEqual(1);
    expect(summaryRes.body.averageRating).toBeGreaterThanOrEqual(1);
  });

  it('rejects a review for an escrow that is not completed', async () => {
    const renter = Keypair.random();
    const host = Keypair.random();
    const escrowId = 900001 + Math.floor(Math.random() * 899999);
    await seedCompletedEscrow(escrowId, renter.publicKey(), host.publicKey());
    await pool.query(`UPDATE escrows SET status = 'active' WHERE escrow_id = $1`, [escrowId]);

    await request(app.getHttpServer())
      .post(`/v1/reviews/escrow/${escrowId}`)
      .set(await authHeaders(app, renter))
      .send({ revieweeWallet: host.publicKey(), rating: 5 })
      .expect(400);
  });
});

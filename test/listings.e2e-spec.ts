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
 * applied — `docker compose up -d && npm run migrate:up`. Skipped (not
 * failed) if DATABASE_URL isn't set, so `npm test` (unit tests) never
 * depends on Docker being available.
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

describeIfDb('Listings (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();
    pool = app.get(PG_POOL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { ok: true });
  });

  it('400s for a malformed listing id instead of a raw DB error', async () => {
    await request(app.getHttpServer()).get('/v1/listings/not-a-uuid').expect(400);
  });

  it('rejects listing creation without wallet auth headers', async () => {
    await request(app.getHttpServer())
      .post('/v1/listings')
      .send({ hostWallet: 'GTEST', title: 'A rental' })
      .expect(401);
  });

  it('creates, lists, and fetches a listing for an authenticated wallet', async () => {
    const kp = Keypair.random();
    const headers = await authHeaders(app, kp);

    const createRes = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(headers)
      .send({ hostWallet: kp.publicKey(), title: 'A rental', vertical: 'rental' })
      .expect(201);

    expect(createRes.body).toMatchObject({
      hostWallet: kp.publicKey(),
      title: 'A rental',
      vertical: 'rental',
    });

    const listRes = await request(app.getHttpServer())
      .get(`/v1/listings?hostWallet=${kp.publicKey()}`)
      .expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.headers['x-total-count']).toBe('1');

    await request(app.getHttpServer())
      .get(`/v1/listings/${createRes.body.id}`)
      .expect(200);
  });

  it('soft-deletes: hidden from reads, but the row and its history survive', async () => {
    const kp = Keypair.random();

    const createRes = await request(app.getHttpServer())
      .post('/v1/listings')
      .set(await authHeaders(app, kp))
      .send({ hostWallet: kp.publicKey(), title: 'to be deleted' })
      .expect(201);
    const id: string = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/v1/listings/${id}`)
      .set(await authHeaders(app, kp))
      .expect(204);

    await request(app.getHttpServer()).get(`/v1/listings/${id}`).expect(404);

    const { rows } = await pool.query(`SELECT deleted_at FROM listings WHERE id = $1`, [
      id,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at).not.toBeNull();

    // Deleting again should 404 (the guard is deleted_at IS NULL), not
    // silently succeed a second time.
    await request(app.getHttpServer())
      .delete(`/v1/listings/${id}`)
      .set(await authHeaders(app, kp))
      .expect(404);
  });

  it('sorts by title in either direction, and rejects an unknown sort field', async () => {
    const kp = Keypair.random();
    for (const title of ['Zebra', 'Apple', 'Mango']) {
      await request(app.getHttpServer())
        .post('/v1/listings')
        .set(await authHeaders(app, kp))
        .send({ hostWallet: kp.publicKey(), title })
        .expect(201);
    }

    const asc = await request(app.getHttpServer())
      .get(`/v1/listings?hostWallet=${kp.publicKey()}&sortBy=title&sortOrder=asc`)
      .expect(200);
    expect(asc.body.map((l: { title: string }) => l.title)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);

    const desc = await request(app.getHttpServer())
      .get(`/v1/listings?hostWallet=${kp.publicKey()}&sortBy=title&sortOrder=desc`)
      .expect(200);
    expect(desc.body.map((l: { title: string }) => l.title)).toEqual([
      'Zebra',
      'Mango',
      'Apple',
    ]);

    await request(app.getHttpServer())
      .get(`/v1/listings?sortBy=host_wallet`)
      .expect(400);
  });
});

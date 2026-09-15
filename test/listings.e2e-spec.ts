import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Keypair } from '@stellar/stellar-sdk';
import { AppModule } from '../src/app.module';

/**
 * Requires a live Postgres reachable at DATABASE_URL with schema.sql
 * applied — `docker-compose up -d` starts one and seeds the schema
 * automatically. Skipped (not failed) if DATABASE_URL isn't set, so
 * `npm test` (unit tests) never depends on Docker being available.
 */
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Listings (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { ok: true });
  });

  it('rejects listing creation without wallet auth headers', async () => {
    await request(app.getHttpServer())
      .post('/listings')
      .send({ hostWallet: 'GTEST', title: 'A rental' })
      .expect(401);
  });

  it('creates, lists, and fetches a listing for an authenticated wallet', async () => {
    const kp = Keypair.random();

    const challengeRes = await request(app.getHttpServer())
      .get(`/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');

    const createRes = await request(app.getHttpServer())
      .post('/listings')
      .set('X-Wallet-Address', kp.publicKey())
      .set('X-Wallet-Signature', signature)
      .send({ hostWallet: kp.publicKey(), title: 'A rental', vertical: 'rental' })
      .expect(201);

    expect(createRes.body).toMatchObject({
      host_wallet: kp.publicKey(),
      title: 'A rental',
      vertical: 'rental',
    });

    const listRes = await request(app.getHttpServer())
      .get(`/listings?hostWallet=${kp.publicKey()}`)
      .expect(200);
    expect(listRes.body).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/listings/${createRes.body.id}`)
      .expect(200);
  });
});

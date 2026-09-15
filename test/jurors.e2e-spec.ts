import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Keypair } from '@stellar/stellar-sdk';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Jurors (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects registration without wallet auth headers', async () => {
    await request(app.getHttpServer())
      .post('/v1/jurors/register')
      .send({ wallet: 'GTEST', stakeAmount: 100 })
      .expect(401);
  });

  it('rejects registration for a wallet other than the authenticated one', async () => {
    const kp = Keypair.random();
    const challengeRes = await request(app.getHttpServer())
      .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');

    await request(app.getHttpServer())
      .post('/v1/jurors/register')
      .set('X-Wallet-Address', kp.publicKey())
      .set('X-Wallet-Signature', signature)
      .send({ wallet: 'GSOMEONE-ELSE', stakeAmount: 100 })
      .expect(403);
  });

  it('registers a juror and can look it up by wallet', async () => {
    const kp = Keypair.random();
    const challengeRes = await request(app.getHttpServer())
      .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');

    await request(app.getHttpServer())
      .post('/v1/jurors/register')
      .set('X-Wallet-Address', kp.publicKey())
      .set('X-Wallet-Signature', signature)
      .send({ wallet: kp.publicKey(), stakeAmount: 250 })
      .expect(201);

    const getRes = await request(app.getHttpServer())
      .get(`/v1/jurors/${kp.publicKey()}`)
      .expect(200);
    expect(getRes.body).toMatchObject({ wallet: kp.publicKey(), stakeAmount: '250' });
  });

  it('404s for a wallet that never registered', async () => {
    await request(app.getHttpServer()).get('/v1/jurors/GNEVER-REGISTERED').expect(404);
  });
});

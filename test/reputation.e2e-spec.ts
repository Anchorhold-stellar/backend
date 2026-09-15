import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Reputation (e2e)', () => {
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

  it('returns a default zero-score record for a wallet with no history', async () => {
    const res = await request(app.getHttpServer())
      .get('/reputation/GNEVER-SCORED')
      .expect(200);

    expect(res.body).toEqual({ wallet: 'GNEVER-SCORED', score: 0, updatedAt: null });
  });

  it('has no public write endpoint', async () => {
    // ReputationController only exposes GET :wallet — confirm nothing else
    // is reachable (adjustScore is internal-only, wired from the dispute
    // resolution cascade, not exposed over HTTP).
    await request(app.getHttpServer())
      .post('/reputation/GWALLET')
      .send({ score: 999 })
      .expect(404);
  });
});

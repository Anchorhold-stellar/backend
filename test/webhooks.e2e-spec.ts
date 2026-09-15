import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createHmac } from 'crypto';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
const SECRET = 'e2e-test-secret';

function sign(body: Record<string, unknown>) {
  const raw = JSON.stringify(body);
  return 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex');
}

describeIfDb('Webhooks (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';
    process.env.KEEPER_WEBHOOK_SECRET = SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    applyGlobalMiddleware(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a keeper-ping with no signature header', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/keeper-ping')
      .send({ escrowId: 1, milestoneIndex: 0 })
      .expect(401);
  });

  it('rejects a keeper-ping with an invalid signature', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/keeper-ping')
      .set('X-Keeper-Signature', 'sha256=' + '0'.repeat(64))
      .send({ escrowId: 1, milestoneIndex: 0 })
      .expect(401);
  });

  it('accepts a keeper-ping with a valid signature', async () => {
    const body = { escrowId: 1, milestoneIndex: 0 };
    await request(app.getHttpServer())
      .post('/webhooks/keeper-ping')
      .set('X-Keeper-Signature', sign(body))
      .send(body)
      .expect(204);
  });
});

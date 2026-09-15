import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { Keypair } from '@stellar/stellar-sdk';
import { AppModule } from '../src/app.module';
import { applyGlobalMiddleware } from '../src/bootstrap';
import { PG_POOL } from '../src/database/pg-pool.provider';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Disputes (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let escrowId: number;

  beforeAll(async () => {
    process.env.ESCROW_CONTRACT_ID ??=
      'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalMiddleware(app);
    await app.init();

    pool = app.get(PG_POOL);

    // Escrows/disputes are normally populated by the indexer from on-chain
    // events, not created via the HTTP API — seed directly for this
    // read-path test, same as the indexer would.
    escrowId = Math.floor(Math.random() * 1_000_000);
    await pool.query(
      `INSERT INTO escrows (escrow_id, renter_wallet, host_wallet, asset_address, total_amount, status)
       VALUES ($1, 'GRENTER', 'GHOST', 'GASSET', 1000, 'disputed')`,
      [escrowId],
    );
    await pool.query(
      `INSERT INTO disputes (escrow_id, milestone_index, opened_by_wallet, evidence_uri)
       VALUES ($1, 0, 'GRENTER', 'ipfs://initial')`,
      [escrowId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM votes WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM dispute_evidence WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM disputes WHERE escrow_id = $1`, [escrowId]);
    await pool.query(`DELETE FROM escrows WHERE escrow_id = $1`, [escrowId]);
    await app.close();
  });

  it('404s for an escrow with no dispute', async () => {
    await request(app.getHttpServer()).get('/v1/disputes/999999999').expect(404);
  });

  it('400s for a non-numeric escrowId in the path instead of a raw DB error', async () => {
    await request(app.getHttpServer()).get('/v1/disputes/not-a-number').expect(400);
  });

  it('fetches a dispute with its evidence', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/disputes/${escrowId}`)
      .expect(200);

    expect(res.body).toMatchObject({
      escrowId,
      openedByWallet: 'GRENTER',
      resolved: false,
      evidence: [],
    });
  });

  it('rejects evidence submission without wallet auth', async () => {
    await request(app.getHttpServer())
      .post(`/v1/disputes/${escrowId}/evidence`)
      .send({ submittedBy: 'GRENTER', uri: 'ipfs://proof' })
      .expect(401);
  });

  it('rejects evidence submitted as a different wallet than the authenticated one', async () => {
    const kp = Keypair.random();
    const challengeRes = await request(app.getHttpServer())
      .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');

    await request(app.getHttpServer())
      .post(`/v1/disputes/${escrowId}/evidence`)
      .set('X-Wallet-Address', kp.publicKey())
      .set('X-Wallet-Signature', signature)
      .send({ submittedBy: 'GSOMEONE-ELSE', uri: 'ipfs://proof' })
      .expect(403);
  });

  it('accepts evidence from the authenticated wallet and it appears on the dispute', async () => {
    const kp = Keypair.random();
    const challengeRes = await request(app.getHttpServer())
      .get(`/v1/auth/challenge?wallet=${kp.publicKey()}`)
      .expect(200);
    const signature = kp
      .sign(Buffer.from(challengeRes.body.nonce, 'utf8'))
      .toString('base64');

    await request(app.getHttpServer())
      .post(`/v1/disputes/${escrowId}/evidence`)
      .set('X-Wallet-Address', kp.publicKey())
      .set('X-Wallet-Signature', signature)
      .send({ submittedBy: kp.publicKey(), uri: 'ipfs://proof', note: 'photo' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/v1/disputes/${escrowId}`)
      .expect(200);
    expect(res.body.evidence).toHaveLength(1);
    expect(res.body.evidence[0]).toMatchObject({
      submittedBy: kp.publicKey(),
      uri: 'ipfs://proof',
    });
  });

  it('404s for votes on an escrow with no dispute', async () => {
    await request(app.getHttpServer()).get('/v1/disputes/999999999/votes').expect(404);
  });

  it('returns an empty tally before any juror has voted', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/disputes/${escrowId}/votes`)
      .expect(200);

    expect(res.body).toEqual({ votes: [], tally: { forRenter: 0, forHost: 0 } });
  });

  it('tallies votes seeded via the indexer path', async () => {
    await pool.query(
      `INSERT INTO votes (escrow_id, juror_wallet, vote_for_renter) VALUES ($1, 'GJUROR1', true), ($1, 'GJUROR2', true), ($1, 'GJUROR3', false)`,
      [escrowId],
    );

    const res = await request(app.getHttpServer())
      .get(`/v1/disputes/${escrowId}/votes`)
      .expect(200);

    expect(res.body.tally).toEqual({ forRenter: 2, forHost: 1 });
    expect(res.body.votes).toHaveLength(3);
  });
});

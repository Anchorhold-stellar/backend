import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';

@Injectable()
export class ReputationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByWallet(wallet: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM reputation WHERE wallet = $1`,
      [wallet],
    );
    return rows[0] ?? null;
  }

  async adjustScore(wallet: string, delta: number) {
    const { rows } = await this.pool.query(
      `INSERT INTO reputation (wallet, score, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (wallet) DO UPDATE
         SET score = reputation.score + EXCLUDED.score,
             updated_at = now()
       RETURNING *`,
      [wallet, delta],
    );
    return rows[0];
  }
}

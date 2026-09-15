import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@Injectable()
export class ReputationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findTop(query: LeaderboardQueryDto) {
    const { rows } = await this.pool.query(
      `SELECT * FROM reputation ORDER BY score DESC, wallet ASC LIMIT $1 OFFSET $2`,
      [query.limit, query.offset],
    );
    return rows;
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query(`SELECT count(*) FROM reputation`);
    return Number(rows[0].count);
  }

  async findByWallet(wallet: string) {
    const { rows } = await this.pool.query(`SELECT * FROM reputation WHERE wallet = $1`, [
      wallet,
    ]);
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

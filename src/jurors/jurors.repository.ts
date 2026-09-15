import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { ListJurorsQueryDto } from './dto/list-jurors-query.dto';

@Injectable()
export class JurorsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async register(wallet: string, stakeAmount: number) {
    const { rows } = await this.pool.query(
      `INSERT INTO jurors (wallet, stake_amount)
       VALUES ($1, $2)
       ON CONFLICT (wallet) DO UPDATE SET stake_amount = EXCLUDED.stake_amount
       RETURNING *`,
      [wallet, stakeAmount],
    );
    return rows[0];
  }

  async findByWallet(wallet: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM jurors WHERE wallet = $1`,
      [wallet],
    );
    return rows[0] ?? null;
  }

  async findAll(query: ListJurorsQueryDto) {
    const { rows } = await this.pool.query(
      `SELECT * FROM jurors ORDER BY registered_at DESC LIMIT $1 OFFSET $2`,
      [query.limit, query.offset],
    );
    return rows;
  }
}

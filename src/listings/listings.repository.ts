import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const { rows } = await this.pool.query(
      `SELECT * FROM listings ORDER BY created_at DESC`,
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM listings WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(dto: CreateListingDto) {
    const { rows } = await this.pool.query(
      `INSERT INTO listings (host_wallet, title, description, vertical)
       VALUES ($1, $2, $3, COALESCE($4, 'rental')) RETURNING *`,
      [dto.hostWallet, dto.title, dto.description ?? null, dto.vertical ?? null],
    );
    return rows[0];
  }

  async update(id: string, dto: UpdateListingDto) {
    const { rows } = await this.pool.query(
      `UPDATE listings SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         vertical = COALESCE($4, vertical)
       WHERE id = $1 RETURNING *`,
      [id, dto.title ?? null, dto.description ?? null, dto.vertical ?? null],
    );
    return rows[0] ?? null;
  }

  async delete(id: string) {
    const { rowCount } = await this.pool.query(
      `DELETE FROM listings WHERE id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';

@Injectable()
export class ListingsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private buildFilter(query: ListListingsQueryDto): { where: string; params: unknown[] } {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (query.vertical) {
      params.push(query.vertical);
      conditions.push(`vertical = $${params.length}`);
    }
    if (query.hostWallet) {
      params.push(query.hostWallet);
      conditions.push(`host_wallet = $${params.length}`);
    }

    return { where: conditions.join(' AND '), params };
  }

  async findAll(query: ListListingsQueryDto) {
    const { where, params } = this.buildFilter(query);
    const listParams = [...params, query.limit, query.offset];

    const { rows } = await this.pool.query(
      `SELECT * FROM listings WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return rows;
  }

  async count(query: ListListingsQueryDto): Promise<number> {
    const { where, params } = this.buildFilter(query);
    const { rows } = await this.pool.query(
      `SELECT count(*) FROM listings WHERE ${where}`,
      params,
    );
    return Number(rows[0].count);
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM listings WHERE id = $1 AND deleted_at IS NULL`,
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
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, dto.title ?? null, dto.description ?? null, dto.vertical ?? null],
    );
    return rows[0] ?? null;
  }

  /** Soft delete — sets deleted_at rather than removing the row, so past
   *  escrows that reference this listing via listing_id keep a valid FK. */
  async delete(id: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE listings SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}

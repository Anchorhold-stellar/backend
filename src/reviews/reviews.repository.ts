import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

@Injectable()
export class ReviewsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private buildFilter(query: ListReviewsQueryDto): { where: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.revieweeWallet) {
      params.push(query.revieweeWallet);
      conditions.push(`reviewee_wallet = $${params.length}`);
    }
    if (query.reviewerWallet) {
      params.push(query.reviewerWallet);
      conditions.push(`reviewer_wallet = $${params.length}`);
    }

    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
  }

  async create(escrowId: string, reviewerWallet: string, dto: CreateReviewDto) {
    const { rows } = await this.pool.query(
      `INSERT INTO reviews (escrow_id, reviewer_wallet, reviewee_wallet, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [escrowId, reviewerWallet, dto.revieweeWallet, dto.rating, dto.comment ?? null],
    );
    return rows[0];
  }

  async findExisting(escrowId: string, reviewerWallet: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM reviews WHERE escrow_id = $1 AND reviewer_wallet = $2`,
      [escrowId, reviewerWallet],
    );
    return rows[0] ?? null;
  }

  async findByEscrow(escrowId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM reviews WHERE escrow_id = $1 ORDER BY created_at ASC`,
      [escrowId],
    );
    return rows;
  }

  async findAll(query: ListReviewsQueryDto) {
    const { where, params } = this.buildFilter(query);
    const listParams = [...params, query.limit, query.offset];

    const { rows } = await this.pool.query(
      `SELECT * FROM reviews ${where}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return rows;
  }

  async count(query: ListReviewsQueryDto): Promise<number> {
    const { where, params } = this.buildFilter(query);
    const { rows } = await this.pool.query(`SELECT count(*) FROM reviews ${where}`, params);
    return Number(rows[0].count);
  }

  async summaryFor(revieweeWallet: string) {
    const { rows } = await this.pool.query(
      `SELECT count(*) AS review_count, COALESCE(AVG(rating), 0) AS average_rating
       FROM reviews WHERE reviewee_wallet = $1`,
      [revieweeWallet],
    );
    return {
      reviewee_wallet: revieweeWallet,
      review_count: Number(rows[0].review_count),
      average_rating: Number(rows[0].average_rating),
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { KeeperPingDto } from './dto/keeper-ping.dto';

@Injectable()
export class WebhooksService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async keeperPing(dto: KeeperPingDto) {
    await this.pool.query(
      `UPDATE milestones SET released = true, released_at = now()
       WHERE escrow_id = $1 AND milestone_index = $2`,
      [dto.escrowId, dto.milestoneIndex],
    );
  }
}

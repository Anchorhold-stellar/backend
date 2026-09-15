import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/pg-pool.provider';

const QUERY_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`query timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await withTimeout(this.pool.query('SELECT 1'), QUERY_TIMEOUT_MS);
      return this.getStatus(key, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // HealthCheckExecutor only treats an indicator as failed if its
      // promise rejects with a HealthCheckError — a resolved value with
      // status:'down' is silently folded into `info` as if healthy, so
      // returning getStatus(key, false, ...) here would report 200 OK.
      throw new HealthCheckError(message, this.getStatus(key, false, { message }));
    }
  }
}

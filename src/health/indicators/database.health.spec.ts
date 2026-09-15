import { HealthCheckError } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';

describe('DatabaseHealthIndicator', () => {
  it('reports up when the query succeeds', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
    const indicator = new DatabaseHealthIndicator(pool as never);

    const result = await indicator.isHealthy('database');

    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws a HealthCheckError when the query fails', async () => {
    const pool = { query: jest.fn().mockRejectedValue(new Error('connection refused')) };
    const indicator = new DatabaseHealthIndicator(pool as never);

    await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(
      HealthCheckError,
    );
  });
});

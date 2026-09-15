import { ReputationRepository } from './reputation.repository';

describe('ReputationRepository', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new ReputationRepository(pool as never), pool };
  }

  it('orders the leaderboard by score DESC with wallet as a tie-breaker', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findTop({ limit: 20, offset: 0 } as never);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY score DESC, wallet ASC');
    expect(params).toEqual([20, 0]);
  });

  it('adjustScore accumulates additively rather than overwriting the stored score', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ wallet: 'GWALLET', score: 15 }] });

    await repo.adjustScore('GWALLET', 5);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('score = reputation.score + EXCLUDED.score');
    expect(params).toEqual(['GWALLET', 5]);
  });
});

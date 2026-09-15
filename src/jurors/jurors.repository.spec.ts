import { JurorsRepository } from './jurors.repository';

describe('JurorsRepository', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new JurorsRepository(pool as never), pool };
  }

  it('registers with wallet and stakeAmount as ordered params', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ wallet: 'GJUROR', stake_amount: 100 }] });

    await repo.register('GJUROR', 100);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (wallet) DO UPDATE');
    expect(params).toEqual(['GJUROR', 100]);
  });

  it('passes limit then offset, in that order, to findAll', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findAll({ limit: 5, offset: 10 } as never);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('LIMIT $1 OFFSET $2');
    expect(params).toEqual([5, 10]);
  });

  it('count() takes no params', async () => {
    const { repo, pool } = makeRepo();

    await repo.count();

    const [, params] = pool.query.mock.calls[0];
    expect(params).toBeUndefined();
  });
});

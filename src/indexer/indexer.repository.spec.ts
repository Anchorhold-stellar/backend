import { IndexerRepository } from './indexer.repository';

describe('IndexerRepository.createEscrow', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    return { repo: new IndexerRepository(pool as never), pool };
  }

  it('inserts a milestones row for each entry in the milestones array', async () => {
    const { repo, pool } = makeRepo();

    await repo.createEscrow(1, 'GRENTER', 'GHOST', 'GASSET', '1000', [
      { index: 0, description: 'deposit', amount: '500' },
      { index: 1, description: 'delivery', amount: '500', autoReleaseAt: '2026-01-01T00:00:00Z' },
    ]);

    // First call is the escrows INSERT, then one INSERT per milestone.
    expect(pool.query).toHaveBeenCalledTimes(3);

    const [milestone0Sql, milestone0Params] = pool.query.mock.calls[1];
    expect(milestone0Sql).toContain('INSERT INTO milestones');
    expect(milestone0Params).toEqual([1, 0, 'deposit', '500', null]);

    const [, milestone1Params] = pool.query.mock.calls[2];
    expect(milestone1Params).toEqual([1, 1, 'delivery', '500', '2026-01-01T00:00:00Z']);
  });

  it('inserts nothing beyond the escrow row when milestones is empty', async () => {
    const { repo, pool } = makeRepo();

    await repo.createEscrow(1, 'GRENTER', 'GHOST', 'GASSET', '1000', []);

    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

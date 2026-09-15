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

  it('defaults listing_id to null when the escrow was not created against a listing', async () => {
    const { repo, pool } = makeRepo();

    await repo.createEscrow(1, 'GRENTER', 'GHOST', 'GASSET', '1000', []);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('listing_id');
    expect(params).toEqual([1, null, 'GRENTER', 'GHOST', 'GASSET', '1000']);
  });

  it('includes listing_id when the escrow was created against a listing', async () => {
    const { repo, pool } = makeRepo();
    const listingId = '11111111-1111-1111-1111-111111111111';

    await repo.createEscrow(1, 'GRENTER', 'GHOST', 'GASSET', '1000', [], listingId);

    const [, params] = pool.query.mock.calls[0];
    expect(params).toEqual([1, listingId, 'GRENTER', 'GHOST', 'GASSET', '1000']);
  });
});

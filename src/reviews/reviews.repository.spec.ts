import { ReviewsRepository } from './reviews.repository';

describe('ReviewsRepository', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new ReviewsRepository(pool as never), pool };
  }

  it('inserts reviewer, reviewee, rating, and comment in order', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1' }] });

    await repo.create('5', 'GRENTER', {
      revieweeWallet: 'GHOST',
      rating: 4,
      comment: 'great host',
    } as never);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO reviews');
    expect(params).toEqual(['5', 'GRENTER', 'GHOST', 4, 'great host']);
  });

  it('stores a null comment when none is given', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1' }] });

    await repo.create('5', 'GRENTER', { revieweeWallet: 'GHOST', rating: 5 } as never);

    expect(pool.query.mock.calls[0][1]).toEqual(['5', 'GRENTER', 'GHOST', 5, null]);
  });

  it('filters by reviewee and reviewer wallets', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findAll({
      limit: 20,
      offset: 0,
      revieweeWallet: 'GHOST',
      reviewerWallet: 'GRENTER',
    } as never);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('reviewee_wallet = $1');
    expect(sql).toContain('reviewer_wallet = $2');
    expect(params).toEqual(['GHOST', 'GRENTER', 20, 0]);
  });

  it('summarizes count and average rating for a wallet', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ review_count: '2', average_rating: '4.5' }] });

    const summary = await repo.summaryFor('GHOST');

    expect(summary).toEqual({
      reviewee_wallet: 'GHOST',
      review_count: 2,
      average_rating: 4.5,
    });
  });

  it('looks up an existing review by escrow and reviewer', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1' }] });

    await repo.findExisting('5', 'GRENTER');

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('escrow_id = $1 AND reviewer_wallet = $2');
    expect(params).toEqual(['5', 'GRENTER']);
  });
});

import { ListingsRepository } from './listings.repository';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';

describe('ListingsRepository query building', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new ListingsRepository(pool as never), pool };
  }

  function query(overrides: Partial<ListListingsQueryDto>): ListListingsQueryDto {
    return { limit: 20, offset: 0, ...overrides } as ListListingsQueryDto;
  }

  it('always excludes soft-deleted rows, with no filters given', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({}));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual([]);
  });

  it('combines vertical and hostWallet filters with the deleted_at guard', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ vertical: 'equipment', hostWallet: 'GHOST' }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).toContain('vertical = $1');
    expect(sql).toContain('host_wallet = $2');
    expect(params).toEqual(['equipment', 'GHOST']);
  });

  it('maps sortBy to the correct column and defaults to created_at DESC', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findAll(query({}));

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY created_at DESC');
  });

  it('maps sortBy=title, sortOrder=asc to the title column ascending', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findAll(query({ sortBy: 'title', sortOrder: 'asc' }));

    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY title ASC');
  });

  it('count() never includes limit/offset in its params', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ vertical: 'rental', limit: 5, offset: 10 }));

    const [, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['rental']);
  });
});

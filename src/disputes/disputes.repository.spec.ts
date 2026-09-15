import { DisputesRepository } from './disputes.repository';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';

describe('DisputesRepository query building', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new DisputesRepository(pool as never), pool };
  }

  function query(overrides: Partial<ListDisputesQueryDto>): ListDisputesQueryDto {
    return { limit: 20, offset: 0, ...overrides } as ListDisputesQueryDto;
  }

  it('omits the WHERE clause entirely when resolved is not given', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({}));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([]);
  });

  it('filters resolved=true', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ resolved: true }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE resolved = $1');
    expect(params).toEqual([true]);
  });

  it('filters resolved=false -- the falsy value must not be treated as "no filter"', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ resolved: false }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE resolved = $1');
    expect(params).toEqual([false]);
  });

  it('appends limit/offset on findAll after any filter params', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findAll(query({ resolved: true, limit: 5, offset: 10 }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual([true, 5, 10]);
    expect(sql).toContain('LIMIT $2 OFFSET $3');
  });
});

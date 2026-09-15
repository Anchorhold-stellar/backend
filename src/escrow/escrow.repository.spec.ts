import { EscrowRepository } from './escrow.repository';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';

describe('EscrowRepository query building', () => {
  function makeRepo() {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }) };
    return { repo: new EscrowRepository(pool as never), pool };
  }

  function query(overrides: Partial<ListEscrowsQueryDto>): ListEscrowsQueryDto {
    return { wallet: 'GWALLET', limit: 20, offset: 0, ...overrides } as ListEscrowsQueryDto;
  }

  it('filters by wallet only when no status is given', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({}));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('(renter_wallet = $1 OR host_wallet = $1)');
    expect(sql).not.toContain('status');
    expect(params).toEqual(['GWALLET']);
  });

  it('adds a status condition and matching param when status is given', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ status: 'active' }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('status = $2');
    expect(params).toEqual(['GWALLET', 'active']);
  });

  it('appends limit/offset as the final two params on findByWallet, after any filter params', async () => {
    const { repo, pool } = makeRepo();
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repo.findByWallet(query({ status: 'disputed', limit: 5, offset: 10 }));

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['GWALLET', 'disputed', 5, 10]);
    expect(sql).toContain('LIMIT $3 OFFSET $4');
  });

  it('count() never includes limit/offset in its params', async () => {
    const { repo, pool } = makeRepo();

    await repo.count(query({ status: 'active', limit: 5, offset: 10 }));

    const [, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['GWALLET', 'active']);
  });
});

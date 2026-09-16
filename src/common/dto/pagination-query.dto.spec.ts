import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('accepts well-formed page/limit values', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 3, limit: 50 });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a page value large enough to overflow Postgres offset math', async () => {
    // Regression test: verified live that this exact value (a valid JS
    // integer, so it passed the old @IsInt()-only check) reached
    // ListingsRepository.findAll's OFFSET clause and Postgres rejected it
    // outright ("invalid input syntax for type bigint: 2e+22"), which
    // AllExceptionsFilter could only report as a raw 500.
    const dto = plainToInstance(PaginationQueryDto, { page: '999999999999999999999' });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects a page value just above the bound', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 1_000_001 });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('accepts a page value right at the bound', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 1_000_000 });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('computes offset from page/limit', () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 3, limit: 20 });

    expect(dto.offset).toBe(40);
  });
});

import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { CamelCaseInterceptor } from './camel-case.interceptor';

function run(data: unknown): Promise<unknown> {
  const interceptor = new CamelCaseInterceptor();
  const handler: CallHandler = { handle: () => of(data) };
  return new Promise((resolve) => {
    interceptor
      .intercept({} as ExecutionContext, handler)
      .subscribe((value) => resolve(value));
  });
}

describe('CamelCaseInterceptor', () => {
  it('converts snake_case object keys to camelCase', async () => {
    const result = await run({ renter_wallet: 'G1', total_amount: '100' });
    expect(result).toEqual({ renterWallet: 'G1', totalAmount: '100' });
  });

  it('recurses into nested objects and arrays', async () => {
    const result = await run({
      escrow_id: 1,
      milestones: [{ milestone_index: 0, auto_release_at: null }],
    });
    expect(result).toEqual({
      escrowId: 1,
      milestones: [{ milestoneIndex: 0, autoReleaseAt: null }],
    });
  });

  it('leaves primitives, null, and Date values untouched', async () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(await run('plain-string')).toBe('plain-string');
    expect(await run(null)).toBeNull();
    expect(await run({ created_at: date })).toEqual({ createdAt: date });
  });
});

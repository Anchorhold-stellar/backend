import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexerStatusService } from './indexer-status.service';

describe('IndexerStatusService', () => {
  function makeService(thresholdMs?: number) {
    const repo = { getCursor: jest.fn() };
    const config = new ConfigService(
      thresholdMs !== undefined ? { INDEXER_STALE_THRESHOLD_MS: String(thresholdMs) } : {},
    );
    return { service: new IndexerStatusService(repo as never, config), repo };
  }

  it('throws NotFoundException when the cursor row is missing', async () => {
    const { service, repo } = makeService();
    repo.getCursor.mockResolvedValue(null);

    await expect(service.getStatus()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports stale: false when updated recently', async () => {
    const { service, repo } = makeService(60_000);
    repo.getCursor.mockResolvedValue({ last_ledger: '42', updated_at: new Date() });

    const result = await service.getStatus();

    expect(result).toMatchObject({ lastLedger: 42, stale: false });
  });

  it('reports stale: true when the cursor has not advanced past the threshold', async () => {
    const { service, repo } = makeService(60_000);
    const oldTimestamp = new Date(Date.now() - 120_000);
    repo.getCursor.mockResolvedValue({ last_ledger: '42', updated_at: oldTimestamp });

    const result = await service.getStatus();

    expect(result.stale).toBe(true);
  });

  it('falls back to the default threshold when not configured', async () => {
    const { service, repo } = makeService();
    // 5 minutes old -- within the 10-minute default, should not be stale.
    repo.getCursor.mockResolvedValue({
      last_ledger: '1',
      updated_at: new Date(Date.now() - 5 * 60_000),
    });

    const result = await service.getStatus();

    expect(result.stale).toBe(false);
  });
});

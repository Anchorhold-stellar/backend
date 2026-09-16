import { ConfigService } from '@nestjs/config';
import { IndexerService } from './indexer.service';
import { MockEventsAdapter } from './adapters/mock-events.adapter';

describe('IndexerService', () => {
  function makeService(configValues: Record<string, string> = {}) {
    const indexerRepo = {
      getLastLedger: jest.fn(async () => 0),
      setLastLedger: jest.fn(async () => undefined),
      touchCursor: jest.fn(async () => undefined),
      createEscrow: jest.fn(async () => undefined),
      fundEscrow: jest.fn(async () => undefined),
      releaseMilestone: jest.fn(async () => undefined),
      completeEscrow: jest.fn(async () => undefined),
      openDispute: jest.fn(async () => undefined),
    };
    const disputes = {
      applyResolution: jest.fn(async () => undefined),
      recordVote: jest.fn(async () => undefined),
    };
    const notifications = { notify: jest.fn(async () => undefined) };
    const scheduler = { addInterval: jest.fn() };
    const service = new IndexerService(
      new MockEventsAdapter(),
      indexerRepo as never,
      disputes as never,
      notifications as never,
      new ConfigService(configValues),
      scheduler as never,
    );
    return { service, indexerRepo, disputes, notifications, scheduler };
  }

  it('applies every fixture event in order and advances the cursor', async () => {
    const { service, indexerRepo, disputes, notifications } = makeService();

    const count = await service.pollOnce();

    expect(count).toBe(6);
    expect(indexerRepo.createEscrow).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      expect.any(String),
      '1000',
      expect.arrayContaining([expect.objectContaining({ index: 0 })]),
      null,
    );
    expect(indexerRepo.fundEscrow).toHaveBeenCalledWith(1);
    expect(indexerRepo.releaseMilestone).toHaveBeenCalledWith(1, 0);
    expect(indexerRepo.openDispute).toHaveBeenCalledWith(
      1,
      0,
      'GRENTERMOCKWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'ipfs://mock-evidence',
    );
    expect(disputes.recordVote).toHaveBeenCalledWith(
      1,
      0,
      'GJURORMOCKWALLETDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      false,
    );
    expect(disputes.applyResolution).toHaveBeenCalledWith('1', 0, 'host_wins');
    expect(indexerRepo.setLastLedger).toHaveBeenCalledWith(6);
    expect(indexerRepo.touchCursor).not.toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith('escrow_funded', { escrowId: 1 });
    expect(notifications.notify).toHaveBeenCalledWith('dispute_opened', {
      escrowId: 1,
      milestoneIndex: 0,
      openedBy: 'GRENTERMOCKWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    });
    expect(notifications.notify).toHaveBeenCalledWith('dispute_resolved', {
      escrowId: 1,
      milestoneIndex: 0,
      outcome: 'host_wins',
    });
  });

  it('does not reprocess events once the cursor has passed them, but still heartbeats', async () => {
    const { service, indexerRepo } = makeService();
    indexerRepo.getLastLedger.mockResolvedValue(6);

    const count = await service.pollOnce();

    expect(count).toBe(0);
    expect(indexerRepo.createEscrow).not.toHaveBeenCalled();
    expect(indexerRepo.setLastLedger).not.toHaveBeenCalled();
    // A poll cycle that finds nothing new must still bump updated_at --
    // otherwise GET /indexer/status can't distinguish "chain is quiet"
    // from "poller died" (see IndexerRepository.touchCursor).
    expect(indexerRepo.touchCursor).toHaveBeenCalled();
  });

  describe('onModuleInit', () => {
    afterEach(() => jest.useRealTimers());

    it('registers the interval using INDEXER_POLL_INTERVAL_MS when configured', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { service, scheduler } = makeService({ INDEXER_POLL_INTERVAL_MS: '2000' });

      service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      expect(scheduler.addInterval).toHaveBeenCalledWith(
        'indexer-poll',
        expect.anything(),
      );
    });

    it('falls back to the 5000ms default when unconfigured', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { service } = makeService();

      service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });
});

import { IndexerService } from './indexer.service';
import { MockEventsAdapter } from './adapters/mock-events.adapter';

describe('IndexerService', () => {
  function makeService() {
    const indexerRepo = {
      getLastLedger: jest.fn(async () => 0),
      setLastLedger: jest.fn(async () => undefined),
      createEscrow: jest.fn(async () => undefined),
      fundEscrow: jest.fn(async () => undefined),
      releaseMilestone: jest.fn(async () => undefined),
      completeEscrow: jest.fn(async () => undefined),
      openDispute: jest.fn(async () => undefined),
    };
    const disputes = { applyResolution: jest.fn(async () => undefined) };
    const service = new IndexerService(
      new MockEventsAdapter(),
      indexerRepo as never,
      disputes as never,
    );
    return { service, indexerRepo, disputes };
  }

  it('applies every fixture event in order and advances the cursor', async () => {
    const { service, indexerRepo } = makeService();

    const count = await service.pollOnce();

    expect(count).toBe(3);
    expect(indexerRepo.createEscrow).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      expect.any(String),
      '1000',
    );
    expect(indexerRepo.fundEscrow).toHaveBeenCalledWith(1);
    expect(indexerRepo.releaseMilestone).toHaveBeenCalledWith(1, 0);
    expect(indexerRepo.setLastLedger).toHaveBeenCalledWith(3);
  });

  it('does not reprocess events once the cursor has passed them', async () => {
    const { service, indexerRepo } = makeService();
    indexerRepo.getLastLedger.mockResolvedValue(3);

    const count = await service.pollOnce();

    expect(count).toBe(0);
    expect(indexerRepo.createEscrow).not.toHaveBeenCalled();
    expect(indexerRepo.setLastLedger).not.toHaveBeenCalled();
  });
});

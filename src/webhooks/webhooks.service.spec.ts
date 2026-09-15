import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  function makeService(overrides: Partial<Record<string, jest.Mock>> = {}) {
    const escrows = {
      releaseMilestoneByIndex: jest.fn(async () => true),
      allMilestonesReleased: jest.fn(async () => false),
      updateStatus: jest.fn(async () => undefined),
      ...overrides,
    };
    return { service: new WebhooksService(escrows as never), escrows };
  }

  it('completes the escrow when the released milestone was the last one outstanding', async () => {
    const { service, escrows } = makeService({
      allMilestonesReleased: jest.fn(async () => true),
    });

    await service.keeperPing({ escrowId: 1, milestoneIndex: 2 });

    expect(escrows.releaseMilestoneByIndex).toHaveBeenCalledWith('1', 2);
    expect(escrows.updateStatus).toHaveBeenCalledWith('1', 'completed');
  });

  it('does not touch escrow status when other milestones remain outstanding', async () => {
    const { service, escrows } = makeService({
      allMilestonesReleased: jest.fn(async () => false),
    });

    await service.keeperPing({ escrowId: 1, milestoneIndex: 0 });

    expect(escrows.updateStatus).not.toHaveBeenCalled();
  });

  it('does not complete the escrow when no matching milestone row was found', async () => {
    const { service, escrows } = makeService({
      releaseMilestoneByIndex: jest.fn(async () => false),
    });

    await service.keeperPing({ escrowId: 1, milestoneIndex: 99 });

    expect(escrows.allMilestonesReleased).not.toHaveBeenCalled();
    expect(escrows.updateStatus).not.toHaveBeenCalled();
  });
});

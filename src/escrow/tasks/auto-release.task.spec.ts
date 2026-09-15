import { AutoReleaseTask } from './auto-release.task';

describe('AutoReleaseTask', () => {
  it('releases each due milestone and completes escrows with nothing left outstanding', async () => {
    const dueMilestones = [
      { id: 'm1', escrow_id: '1' },
      { id: 'm2', escrow_id: '2' },
    ];
    const repo = {
      findDueMilestones: jest.fn(async () => dueMilestones),
      releaseMilestone: jest.fn(async () => undefined),
      allMilestonesReleased: jest.fn(async (escrowId: string) => escrowId === '1'),
      updateStatus: jest.fn(async () => undefined),
    };

    const task = new AutoReleaseTask(repo as never);
    await task.run();

    expect(repo.releaseMilestone).toHaveBeenCalledWith('m1');
    expect(repo.releaseMilestone).toHaveBeenCalledWith('m2');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', 'completed');
    expect(repo.updateStatus).not.toHaveBeenCalledWith('2', 'completed');
  });

  it('does nothing when no milestones are due', async () => {
    const repo = {
      findDueMilestones: jest.fn(async () => []),
      releaseMilestone: jest.fn(),
      allMilestonesReleased: jest.fn(),
      updateStatus: jest.fn(),
    };

    const task = new AutoReleaseTask(repo as never);
    await task.run();

    expect(repo.releaseMilestone).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});

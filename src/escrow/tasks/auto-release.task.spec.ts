import { ConfigService } from '@nestjs/config';
import { AutoReleaseTask } from './auto-release.task';

describe('AutoReleaseTask', () => {
  function makeTask(dueMilestones: unknown[], configValues: Record<string, string> = {}) {
    const repo = {
      findDueMilestones: jest.fn(async () => dueMilestones),
      releaseMilestone: jest.fn(async () => undefined),
      allMilestonesReleased: jest.fn(async (escrowId: string) => escrowId === '1'),
      updateStatus: jest.fn(async () => undefined),
    };
    const scheduler = { addInterval: jest.fn() };
    const task = new AutoReleaseTask(
      repo as never,
      new ConfigService(configValues),
      scheduler as never,
    );
    return { task, repo, scheduler };
  }

  it('releases each due milestone and completes escrows with nothing left outstanding', async () => {
    const { task, repo } = makeTask([
      { id: 'm1', escrow_id: '1' },
      { id: 'm2', escrow_id: '2' },
    ]);

    await task.run();

    expect(repo.releaseMilestone).toHaveBeenCalledWith('m1');
    expect(repo.releaseMilestone).toHaveBeenCalledWith('m2');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', 'completed');
    expect(repo.updateStatus).not.toHaveBeenCalledWith('2', 'completed');
  });

  it('does nothing when no milestones are due', async () => {
    const { task, repo } = makeTask([]);

    await task.run();

    expect(repo.releaseMilestone).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  describe('onModuleInit', () => {
    afterEach(() => jest.useRealTimers());

    it('registers the interval using AUTO_RELEASE_POLL_INTERVAL_MS when configured', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { task, scheduler } = makeTask([], { AUTO_RELEASE_POLL_INTERVAL_MS: '5000' });

      task.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(scheduler.addInterval).toHaveBeenCalledWith(
        'auto-release-poll',
        expect.anything(),
      );
    });

    it('falls back to the 60000ms default when unconfigured', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { task } = makeTask([]);

      task.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    });
  });
});

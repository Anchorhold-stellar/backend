import { NotFoundException } from '@nestjs/common';
import { DisputesService } from './disputes.service';

describe('DisputesService.applyResolution', () => {
  const escrow = {
    escrow_id: '1',
    renter_wallet: 'GRENTER',
    host_wallet: 'GHOST',
  };

  function makeService() {
    const calls: unknown[][] = [];
    const disputesRepo = {
      markResolved: jest.fn(async (id: string, milestoneIndex: number, outcome: string) => {
        calls.push(['markResolved', id, milestoneIndex, outcome]);
      }),
      findOne: jest.fn(),
      findVotes: jest.fn(),
      recordVote: jest.fn(),
    };
    const escrowRepo = {
      findById: jest.fn(async () => escrow),
      updateStatus: jest.fn(async (id: string, status: string) => {
        calls.push(['updateStatus', id, status]);
      }),
    };
    const reputation = {
      adjustScore: jest.fn(async (wallet: string, delta: number) => {
        calls.push(['adjustScore', wallet, delta]);
      }),
    };
    const soroban = {};

    const service = new DisputesService(
      disputesRepo as never,
      soroban as never,
      escrowRepo as never,
      reputation as never,
    );
    return { service, calls, disputesRepo, escrowRepo, reputation };
  }

  it('cancels the escrow and rewards the renter when renter_wins', async () => {
    const { service, escrowRepo, reputation } = makeService();

    await service.applyResolution('1', 0, 'renter_wins');

    expect(escrowRepo.updateStatus).toHaveBeenCalledWith('1', 'cancelled');
    expect(reputation.adjustScore).toHaveBeenCalledWith('GRENTER', 10);
    expect(reputation.adjustScore).toHaveBeenCalledWith('GHOST', -5);
  });

  it('completes the escrow and rewards the host when host_wins', async () => {
    const { service, escrowRepo, reputation } = makeService();

    await service.applyResolution('1', 0, 'host_wins');

    expect(escrowRepo.updateStatus).toHaveBeenCalledWith('1', 'completed');
    expect(reputation.adjustScore).toHaveBeenCalledWith('GHOST', 10);
    expect(reputation.adjustScore).toHaveBeenCalledWith('GRENTER', -5);
  });

  it('resolves the dispute keyed by its own milestone, not just the escrow', async () => {
    // Regression coverage for the disputes/votes composite-key fix: an
    // escrow can carry more than one milestone's dispute over its
    // lifetime, so resolution must target (escrowId, milestoneIndex), not
    // escrowId alone -- otherwise resolving milestone 1's dispute could
    // clobber milestone 0's already-resolved row instead.
    const { service, disputesRepo } = makeService();

    await service.applyResolution('1', 2, 'host_wins');

    expect(disputesRepo.markResolved).toHaveBeenCalledWith('1', 2, 'host_wins');
  });
});

describe('DisputesService.findVotes', () => {
  function makeService() {
    const disputesRepo = {
      findOne: jest.fn(),
      findVotes: jest.fn(),
    };
    const service = new DisputesService(
      disputesRepo as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, disputesRepo };
  }

  it('throws NotFoundException when there is no dispute for the escrow/milestone', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findOne.mockResolvedValue(null);

    await expect(service.findVotes('999', 0)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tallies votes for renter vs host', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findOne.mockResolvedValue({ escrow_id: '1', milestone_index: 0 });
    disputesRepo.findVotes.mockResolvedValue([
      { juror_wallet: 'G1', vote_for_renter: true },
      { juror_wallet: 'G2', vote_for_renter: true },
      { juror_wallet: 'G3', vote_for_renter: false },
    ]);

    const result = await service.findVotes('1', 0);

    expect(result.tally).toEqual({ forRenter: 2, forHost: 1 });
    expect(result.votes).toHaveLength(3);
    expect(disputesRepo.findVotes).toHaveBeenCalledWith('1', 0);
  });

  it('returns a zero tally when no jurors have voted yet', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findOne.mockResolvedValue({ escrow_id: '1', milestone_index: 0 });
    disputesRepo.findVotes.mockResolvedValue([]);

    const result = await service.findVotes('1', 0);

    expect(result.tally).toEqual({ forRenter: 0, forHost: 0 });
  });
});

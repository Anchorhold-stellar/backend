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
      markResolved: jest.fn(async (id: string, outcome: string) => {
        calls.push(['markResolved', id, outcome]);
      }),
      findByEscrowId: jest.fn(),
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

    await service.applyResolution('1', 'renter_wins');

    expect(escrowRepo.updateStatus).toHaveBeenCalledWith('1', 'cancelled');
    expect(reputation.adjustScore).toHaveBeenCalledWith('GRENTER', 10);
    expect(reputation.adjustScore).toHaveBeenCalledWith('GHOST', -5);
  });

  it('completes the escrow and rewards the host when host_wins', async () => {
    const { service, escrowRepo, reputation } = makeService();

    await service.applyResolution('1', 'host_wins');

    expect(escrowRepo.updateStatus).toHaveBeenCalledWith('1', 'completed');
    expect(reputation.adjustScore).toHaveBeenCalledWith('GHOST', 10);
    expect(reputation.adjustScore).toHaveBeenCalledWith('GRENTER', -5);
  });
});

describe('DisputesService.findVotes', () => {
  function makeService() {
    const disputesRepo = {
      findByEscrowId: jest.fn(),
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

  it('throws NotFoundException when there is no dispute for the escrow', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findByEscrowId.mockResolvedValue(null);

    await expect(service.findVotes('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tallies votes for renter vs host', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findByEscrowId.mockResolvedValue({ escrow_id: '1' });
    disputesRepo.findVotes.mockResolvedValue([
      { juror_wallet: 'G1', vote_for_renter: true },
      { juror_wallet: 'G2', vote_for_renter: true },
      { juror_wallet: 'G3', vote_for_renter: false },
    ]);

    const result = await service.findVotes('1');

    expect(result.tally).toEqual({ forRenter: 2, forHost: 1 });
    expect(result.votes).toHaveLength(3);
  });

  it('returns a zero tally when no jurors have voted yet', async () => {
    const { service, disputesRepo } = makeService();
    disputesRepo.findByEscrowId.mockResolvedValue({ escrow_id: '1' });
    disputesRepo.findVotes.mockResolvedValue([]);

    const result = await service.findVotes('1');

    expect(result.tally).toEqual({ forRenter: 0, forHost: 0 });
  });
});

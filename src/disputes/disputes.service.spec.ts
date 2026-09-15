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

import { ReputationService } from './reputation.service';

describe('ReputationService', () => {
  function makeService() {
    const repo = { findByWallet: jest.fn(), adjustScore: jest.fn() };
    return { service: new ReputationService(repo as never), repo };
  }

  it('returns a default zero-score record for a wallet with no history', async () => {
    const { service, repo } = makeService();
    repo.findByWallet.mockResolvedValue(null);

    const result = await service.findByWallet('GNEW');

    expect(result).toEqual({ wallet: 'GNEW', score: 0, updated_at: null });
  });

  it('returns the existing record when one exists', async () => {
    const { service, repo } = makeService();
    repo.findByWallet.mockResolvedValue({ wallet: 'GKNOWN', score: 25, updated_at: 'x' });

    await expect(service.findByWallet('GKNOWN')).resolves.toEqual({
      wallet: 'GKNOWN',
      score: 25,
      updated_at: 'x',
    });
  });

  it('delegates adjustScore straight through to the repository', () => {
    const { service, repo } = makeService();

    service.adjustScore('GWALLET', -5);

    expect(repo.adjustScore).toHaveBeenCalledWith('GWALLET', -5);
  });
});

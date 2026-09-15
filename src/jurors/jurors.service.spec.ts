import { NotFoundException } from '@nestjs/common';
import { JurorsService } from './jurors.service';

describe('JurorsService', () => {
  function makeService() {
    const repo = { register: jest.fn(), findByWallet: jest.fn(), findAll: jest.fn() };
    return { service: new JurorsService(repo as never), repo };
  }

  it('registers a juror with wallet and stake amount', async () => {
    const { service, repo } = makeService();
    repo.register.mockResolvedValue({ wallet: 'GJUROR', stake_amount: 500 });

    await service.register({ wallet: 'GJUROR', stakeAmount: 500 });

    expect(repo.register).toHaveBeenCalledWith('GJUROR', 500);
  });

  it('throws NotFoundException for an unregistered wallet', async () => {
    const { service, repo } = makeService();
    repo.findByWallet.mockResolvedValue(null);

    await expect(service.findByWallet('GUNKNOWN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the juror record when found', async () => {
    const { service, repo } = makeService();
    repo.findByWallet.mockResolvedValue({ wallet: 'GJUROR', stake_amount: 500 });

    await expect(service.findByWallet('GJUROR')).resolves.toEqual({
      wallet: 'GJUROR',
      stake_amount: 500,
    });
  });
});

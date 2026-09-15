import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  function makeService() {
    const repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    return { service: new ListingsService(repo as never), repo };
  }

  it('throws NotFoundException fetching a listing that does not exist', async () => {
    const { service, repo } = makeService();
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('ownership enforcement', () => {
    it('rejects update from a wallet that is not the listing host', async () => {
      const { service, repo } = makeService();
      repo.findById.mockResolvedValue({ id: '1', host_wallet: 'GHOST' });

      await expect(
        service.update('1', { title: 'new' } as never, 'GIMPOSTER'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects delete from a wallet that is not the listing host', async () => {
      const { service, repo } = makeService();
      repo.findById.mockResolvedValue({ id: '1', host_wallet: 'GHOST' });

      await expect(service.delete('1', 'GIMPOSTER')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('allows update from the listing host', async () => {
      const { service, repo } = makeService();
      repo.findById.mockResolvedValue({ id: '1', host_wallet: 'GHOST' });
      repo.update.mockResolvedValue({ id: '1', host_wallet: 'GHOST', title: 'new' });

      const result = await service.update('1', { title: 'new' } as never, 'GHOST');

      expect(result).toEqual({ id: '1', host_wallet: 'GHOST', title: 'new' });
      expect(repo.update).toHaveBeenCalledWith('1', { title: 'new' });
    });

    it('throws NotFoundException if the listing disappears between ownership check and update', async () => {
      const { service, repo } = makeService();
      repo.findById.mockResolvedValue({ id: '1', host_wallet: 'GHOST' });
      repo.update.mockResolvedValue(null);

      await expect(
        service.update('1', { title: 'new' } as never, 'GHOST'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

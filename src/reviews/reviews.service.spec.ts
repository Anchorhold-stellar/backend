import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  function makeService(escrow: unknown = { renter_wallet: 'GRENTER', host_wallet: 'GHOST', status: 'completed' }) {
    const reviews = {
      findByEscrow: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      summaryFor: jest.fn(),
      findExisting: jest.fn(),
      create: jest.fn(),
    };
    const escrows = { findById: jest.fn().mockResolvedValue(escrow) };
    const reputation = { adjustScore: jest.fn() };
    return {
      service: new ReviewsService(reviews as never, escrows as never, reputation as never),
      reviews,
      escrows,
      reputation,
    };
  }

  it('rejects self-reviews', async () => {
    const { service } = makeService();

    await expect(
      service.create('5', 'GRENTER', { revieweeWallet: 'GRENTER', rating: 5 } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reviews for escrows that are not completed', async () => {
    const { service } = makeService({ renter_wallet: 'GRENTER', host_wallet: 'GHOST', status: 'active' });

    await expect(
      service.create('5', 'GRENTER', { revieweeWallet: 'GHOST', rating: 5 } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reviews from wallets outside the escrow', async () => {
    const { service } = makeService();

    await expect(
      service.create('5', 'GOUTSIDER', { revieweeWallet: 'GHOST', rating: 5 } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a second review from the same reviewer on the same escrow', async () => {
    const { service, reviews } = makeService();
    reviews.findExisting.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('5', 'GRENTER', { revieweeWallet: 'GHOST', rating: 5 } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(reviews.create).not.toHaveBeenCalled();
  });

  it('creates the review when the escrow is completed and the reviewer is a party', async () => {
    const { service, reviews, reputation } = makeService();
    reviews.findExisting.mockResolvedValue(null);
    reviews.create.mockResolvedValue({ id: 'r1', rating: 5 });

    const result = await service.create(
      '5',
      'GRENTER',
      { revieweeWallet: 'GHOST', rating: 5 } as never,
    );

    expect(result).toEqual({ id: 'r1', rating: 5 });
    expect(reviews.create).toHaveBeenCalledWith('5', 'GRENTER', {
      revieweeWallet: 'GHOST',
      rating: 5,
    });
    expect(reputation.adjustScore).toHaveBeenCalledWith('GHOST', 2);
  });

  it('leaves reputation untouched for a middle-of-the-road 3-star review', async () => {
    const { service, reviews, reputation } = makeService();
    reviews.findExisting.mockResolvedValue(null);
    reviews.create.mockResolvedValue({ id: 'r1', rating: 3 });

    await service.create('5', 'GRENTER', { revieweeWallet: 'GHOST', rating: 3 } as never);

    expect(reputation.adjustScore).not.toHaveBeenCalled();
  });
});

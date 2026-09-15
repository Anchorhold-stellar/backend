import { NotFoundException } from '@nestjs/common';
import { EscrowService } from './escrow.service';

describe('EscrowService', () => {
  function makeService() {
    const escrows = {
      findByWallet: jest.fn(),
      findById: jest.fn(),
      findMilestones: jest.fn(),
    };
    const soroban = { buildContractCallXdr: jest.fn().mockResolvedValue('unsigned-xdr') };
    const service = new EscrowService(escrows as never, soroban as never);
    return { service, escrows, soroban };
  }

  it('throws NotFoundException when the escrow does not exist', async () => {
    const { service, escrows } = makeService();
    escrows.findById.mockResolvedValue(null);

    await expect(service.findById('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('merges milestones into the escrow detail response', async () => {
    const { service, escrows } = makeService();
    escrows.findById.mockResolvedValue({ escrow_id: '1', status: 'active' });
    escrows.findMilestones.mockResolvedValue([{ milestone_index: 0 }]);

    const result = await service.findById('1');

    expect(result).toEqual({
      escrow_id: '1',
      status: 'active',
      milestones: [{ milestone_index: 0 }],
    });
  });

  it('builds create_escrow XDR using renterWallet as the fee-paying source', async () => {
    const { service, soroban } = makeService();
    const dto = {
      renterWallet: 'GRENTER',
      hostWallet: 'GHOST',
      assetAddress: 'GASSET',
      milestones: [{ description: 'm1', amount: 100 }],
    };

    await service.buildCreate(dto as never);

    expect(soroban.buildContractCallXdr).toHaveBeenCalledWith(
      'create_escrow',
      'GRENTER',
      ['GRENTER', 'GHOST', 'GASSET', dto.milestones],
    );
  });

  it('builds confirm_milestone XDR with the correct argument order', async () => {
    const { service, soroban } = makeService();

    await service.buildConfirmMilestone({
      renterWallet: 'GRENTER',
      escrowId: 5,
      milestoneIndex: 2,
    } as never);

    expect(soroban.buildContractCallXdr).toHaveBeenCalledWith(
      'confirm_milestone',
      'GRENTER',
      ['GRENTER', 5, 2],
    );
  });
});

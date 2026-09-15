import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SorobanService } from '../soroban/soroban.service';
import { EscrowRepository } from './escrow.repository';
import { BuildCreateEscrowDto } from './dto/build-create-escrow.dto';
import { BuildDepositDto } from './dto/build-deposit.dto';
import { BuildConfirmMilestoneDto } from './dto/build-confirm-milestone.dto';
import { BuildCancelEscrowDto } from './dto/build-cancel-escrow.dto';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';

const CANCELLABLE_STATUSES = ['created'];

@Injectable()
export class EscrowService {
  constructor(
    private readonly escrows: EscrowRepository,
    private readonly soroban: SorobanService,
  ) {}

  findByWallet(query: ListEscrowsQueryDto) {
    return this.escrows.findByWallet(query);
  }

  async findById(escrowId: string) {
    const escrow = await this.escrows.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('escrow not found');
    }
    const milestones = await this.escrows.findMilestones(escrowId);
    return { ...escrow, milestones };
  }

  buildCreate(dto: BuildCreateEscrowDto) {
    return this.soroban.buildContractCallXdr('create_escrow', dto.renterWallet, [
      dto.renterWallet,
      dto.hostWallet,
      dto.assetAddress,
      dto.milestones,
    ]);
  }

  buildDeposit(dto: BuildDepositDto) {
    return this.soroban.buildContractCallXdr('deposit', dto.renterWallet, [
      dto.renterWallet,
      dto.escrowId,
    ]);
  }

  buildConfirmMilestone(dto: BuildConfirmMilestoneDto) {
    return this.soroban.buildContractCallXdr('confirm_milestone', dto.renterWallet, [
      dto.renterWallet,
      dto.escrowId,
      dto.milestoneIndex,
    ]);
  }

  /**
   * Cancellation is only meaningful before funds move — once the escrow
   * is active (deposited) or further along, the contract's dispute path
   * is how a renter gets out of it, not a plain cancel. This is a
   * client-side convenience check (the contract enforces the real
   * invariant); it just saves the caller a doomed on-chain transaction.
   */
  async buildCancel(dto: BuildCancelEscrowDto) {
    const escrow = await this.escrows.findById(String(dto.escrowId));
    if (!escrow) {
      throw new NotFoundException('escrow not found');
    }
    if (!CANCELLABLE_STATUSES.includes(escrow.status)) {
      throw new BadRequestException(
        `escrow in status '${escrow.status}' cannot be cancelled — only escrows still in 'created' status can be`,
      );
    }

    return this.soroban.buildContractCallXdr('cancel_escrow', dto.renterWallet, [
      dto.renterWallet,
      dto.escrowId,
    ]);
  }
}

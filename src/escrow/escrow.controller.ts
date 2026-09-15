import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EscrowService } from './escrow.service';
import { BuildCreateEscrowDto } from './dto/build-create-escrow.dto';
import { BuildDepositDto } from './dto/build-deposit.dto';
import { BuildConfirmMilestoneDto } from './dto/build-confirm-milestone.dto';
import { BuildCancelEscrowDto } from './dto/build-cancel-escrow.dto';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';
import { setTotalCountHeader } from '../common/pagination';

@ApiTags('escrows')
@Controller('escrows')
export class EscrowController {
  constructor(private readonly escrows: EscrowService) {}

  @Get()
  async findByWallet(
    @Query() query: ListEscrowsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [rows, total] = await Promise.all([
      this.escrows.findByWallet(query),
      this.escrows.count(query),
    ]);
    setTotalCountHeader(res, total);
    return rows;
  }

  @Get(':escrowId')
  findOne(@Param('escrowId') escrowId: string) {
    return this.escrows.findById(escrowId);
  }

  @Post('build/create')
  @UseGuards(WalletAuthGuard)
  buildCreate(@Body() dto: BuildCreateEscrowDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.renterWallet, wallet);
    return this.escrows.buildCreate(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/deposit')
  @UseGuards(WalletAuthGuard)
  buildDeposit(@Body() dto: BuildDepositDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.renterWallet, wallet);
    return this.escrows.buildDeposit(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/confirm-milestone')
  @UseGuards(WalletAuthGuard)
  buildConfirmMilestone(
    @Body() dto: BuildConfirmMilestoneDto,
    @CurrentWallet() wallet: string,
  ) {
    assertWalletMatches(dto.renterWallet, wallet);
    return this.escrows.buildConfirmMilestone(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/cancel')
  @UseGuards(WalletAuthGuard)
  buildCancel(@Body() dto: BuildCancelEscrowDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.renterWallet, wallet);
    return this.escrows.buildCancel(dto).then((xdr) => ({ xdr }));
  }
}

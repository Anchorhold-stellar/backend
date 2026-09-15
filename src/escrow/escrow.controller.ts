import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { BuildCreateEscrowDto } from './dto/build-create-escrow.dto';
import { BuildDepositDto } from './dto/build-deposit.dto';
import { BuildConfirmMilestoneDto } from './dto/build-confirm-milestone.dto';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';

@Controller('escrows')
export class EscrowController {
  constructor(private readonly escrows: EscrowService) {}

  @Get()
  findByWallet(@Query() query: ListEscrowsQueryDto) {
    return this.escrows.findByWallet(query);
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
}

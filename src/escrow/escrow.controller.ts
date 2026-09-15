import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { BuildCreateEscrowDto } from './dto/build-create-escrow.dto';
import { BuildDepositDto } from './dto/build-deposit.dto';
import { BuildConfirmMilestoneDto } from './dto/build-confirm-milestone.dto';
import { ListEscrowsQueryDto } from './dto/list-escrows-query.dto';

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
  buildCreate(@Body() dto: BuildCreateEscrowDto) {
    return this.escrows.buildCreate(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/deposit')
  buildDeposit(@Body() dto: BuildDepositDto) {
    return this.escrows.buildDeposit(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/confirm-milestone')
  buildConfirmMilestone(@Body() dto: BuildConfirmMilestoneDto) {
    return this.escrows.buildConfirmMilestone(dto).then((xdr) => ({ xdr }));
  }
}

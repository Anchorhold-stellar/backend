import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { BuildCreateEscrowDto } from './dto/build-create-escrow.dto';
import { BuildDepositDto } from './dto/build-deposit.dto';
import { BuildConfirmMilestoneDto } from './dto/build-confirm-milestone.dto';

@Controller('escrows')
export class EscrowController {
  constructor(private readonly escrows: EscrowService) {}

  @Get()
  findByWallet(@Query('wallet') wallet?: string) {
    if (!wallet) {
      throw new BadRequestException('wallet query param required');
    }
    return this.escrows.findByWallet(wallet);
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

import { Controller, Get, Param } from '@nestjs/common';
import { ReputationService } from './reputation.service';

@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get(':wallet')
  findOne(@Param('wallet') wallet: string) {
    return this.reputation.findByWallet(wallet);
  }
}

import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { BuildRaiseDisputeDto } from './dto/build-raise-dispute.dto';
import { BuildVoteDisputeDto } from './dto/build-vote-dispute.dto';
import { BuildResolveDisputeDto } from './dto/build-resolve-dispute.dto';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get(':escrowId')
  findOne(@Param('escrowId') escrowId: string) {
    return this.disputes.findByEscrowId(escrowId);
  }

  @Post(':escrowId/evidence')
  @HttpCode(201)
  addEvidence(@Param('escrowId') escrowId: string, @Body() dto: AddEvidenceDto) {
    return this.disputes.addEvidence(escrowId, dto);
  }

  @Post('build/raise')
  buildRaise(@Body() dto: BuildRaiseDisputeDto) {
    return this.disputes.buildRaise(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/vote')
  buildVote(@Body() dto: BuildVoteDisputeDto) {
    return this.disputes.buildVote(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/resolve')
  buildResolve(@Body() dto: BuildResolveDisputeDto) {
    return this.disputes.buildResolve(dto).then((xdr) => ({ xdr }));
  }
}

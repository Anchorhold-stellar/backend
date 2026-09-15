import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { BuildRaiseDisputeDto } from './dto/build-raise-dispute.dto';
import { BuildVoteDisputeDto } from './dto/build-vote-dispute.dto';
import { BuildResolveDisputeDto } from './dto/build-resolve-dispute.dto';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';

@ApiTags('disputes')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  findAll(@Query() query: ListDisputesQueryDto) {
    return this.disputes.findAll(query);
  }

  @Get(':escrowId')
  findOne(@Param('escrowId') escrowId: string) {
    return this.disputes.findByEscrowId(escrowId);
  }

  @Get(':escrowId/votes')
  findVotes(@Param('escrowId') escrowId: string) {
    return this.disputes.findVotes(escrowId);
  }

  @Post(':escrowId/evidence')
  @HttpCode(201)
  @UseGuards(WalletAuthGuard)
  addEvidence(
    @Param('escrowId') escrowId: string,
    @Body() dto: AddEvidenceDto,
    @CurrentWallet() wallet: string,
  ) {
    assertWalletMatches(dto.submittedBy, wallet);
    return this.disputes.addEvidence(escrowId, dto);
  }

  @Post('build/raise')
  @UseGuards(WalletAuthGuard)
  buildRaise(@Body() dto: BuildRaiseDisputeDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.callerWallet, wallet);
    return this.disputes.buildRaise(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/vote')
  @UseGuards(WalletAuthGuard)
  buildVote(@Body() dto: BuildVoteDisputeDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.jurorWallet, wallet);
    return this.disputes.buildVote(dto).then((xdr) => ({ xdr }));
  }

  @Post('build/resolve')
  @UseGuards(WalletAuthGuard)
  buildResolve(@Body() dto: BuildResolveDisputeDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.callerWallet, wallet);
    return this.disputes.buildResolve(dto).then((xdr) => ({ xdr }));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { SorobanService } from '../soroban/soroban.service';
import { DisputesRepository } from './disputes.repository';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { BuildRaiseDisputeDto } from './dto/build-raise-dispute.dto';
import { BuildVoteDisputeDto } from './dto/build-vote-dispute.dto';
import { BuildResolveDisputeDto } from './dto/build-resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly disputes: DisputesRepository,
    private readonly soroban: SorobanService,
  ) {}

  async findByEscrowId(escrowId: string) {
    const dispute = await this.disputes.findByEscrowId(escrowId);
    if (!dispute) {
      throw new NotFoundException('no dispute for this escrow');
    }
    const evidence = await this.disputes.findEvidence(escrowId);
    return { ...dispute, evidence };
  }

  addEvidence(escrowId: string, dto: AddEvidenceDto) {
    return this.disputes.addEvidence(
      escrowId,
      dto.submittedBy,
      dto.uri,
      dto.note ?? null,
    );
  }

  buildRaise(dto: BuildRaiseDisputeDto) {
    return this.soroban.buildContractCallXdr(
      'raise_dispute',
      dto.callerWallet,
      [dto.callerWallet, dto.escrowId, dto.milestoneIndex, dto.evidenceUri],
    );
  }

  buildVote(dto: BuildVoteDisputeDto) {
    return this.soroban.buildContractCallXdr('vote_dispute', dto.jurorWallet, [
      dto.jurorWallet,
      dto.escrowId,
      dto.voteForRenter,
    ]);
  }

  buildResolve(dto: BuildResolveDisputeDto) {
    return this.soroban.buildContractCallXdr(
      'resolve_dispute',
      dto.callerWallet,
      [dto.escrowId],
    );
  }
}

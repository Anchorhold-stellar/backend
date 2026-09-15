import { Injectable, NotFoundException } from '@nestjs/common';
import { SorobanService } from '../soroban/soroban.service';
import { EscrowRepository } from '../escrow/escrow.repository';
import { ReputationService } from '../reputation/reputation.service';
import { DisputesRepository } from './disputes.repository';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { BuildRaiseDisputeDto } from './dto/build-raise-dispute.dto';
import { BuildVoteDisputeDto } from './dto/build-vote-dispute.dto';
import { BuildResolveDisputeDto } from './dto/build-resolve-dispute.dto';
import { ListDisputesQueryDto } from './dto/list-disputes-query.dto';

export type DisputeOutcome = 'renter_wins' | 'host_wins';

// Winning a dispute is a stronger reputation signal than losing one is a
// penalty — asymmetric on purpose so repeated bad-faith disputes still
// cost more than they gain even when split roughly evenly.
const REPUTATION_DELTA_WINNER = 10;
const REPUTATION_DELTA_LOSER = -5;

@Injectable()
export class DisputesService {
  constructor(
    private readonly disputes: DisputesRepository,
    private readonly soroban: SorobanService,
    private readonly escrows: EscrowRepository,
    private readonly reputation: ReputationService,
  ) {}

  findAll(query: ListDisputesQueryDto) {
    return this.disputes.findAll(query);
  }

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
    return this.soroban.buildContractCallXdr('raise_dispute', dto.callerWallet, [
      dto.callerWallet,
      dto.escrowId,
      dto.milestoneIndex,
      dto.evidenceUri,
    ]);
  }

  buildVote(dto: BuildVoteDisputeDto) {
    return this.soroban.buildContractCallXdr('vote_dispute', dto.jurorWallet, [
      dto.jurorWallet,
      dto.escrowId,
      dto.voteForRenter,
    ]);
  }

  buildResolve(dto: BuildResolveDisputeDto) {
    return this.soroban.buildContractCallXdr('resolve_dispute', dto.callerWallet, [
      dto.escrowId,
    ]);
  }

  /**
   * Applies a `dispute_resolved` on-chain event to the read model: marks
   * the dispute resolved, cascades the outcome into the escrow's status,
   * and adjusts both parties' reputation. Called by the indexer when it
   * processes the event — never invoked directly from an HTTP route,
   * since the contract (not this backend) is the source of truth for who
   * won.
   */
  async applyResolution(escrowId: string, outcome: DisputeOutcome) {
    await this.disputes.markResolved(escrowId, outcome);

    const escrow = await this.escrows.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException(`escrow ${escrowId} not found for resolved dispute`);
    }

    const newStatus = outcome === 'renter_wins' ? 'cancelled' : 'completed';
    await this.escrows.updateStatus(escrowId, newStatus);

    const winnerWallet =
      outcome === 'renter_wins' ? escrow.renter_wallet : escrow.host_wallet;
    const loserWallet =
      outcome === 'renter_wins' ? escrow.host_wallet : escrow.renter_wallet;

    await this.reputation.adjustScore(winnerWallet, REPUTATION_DELTA_WINNER);
    await this.reputation.adjustScore(loserWallet, REPUTATION_DELTA_LOSER);
  }
}

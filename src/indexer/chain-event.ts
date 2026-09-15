export interface MilestoneDefinition {
  index: number;
  description: string;
  amount: string;
  autoReleaseAt?: string;
}

export type ChainEvent =
  | {
      type: 'escrow_created';
      ledger: number;
      escrowId: number;
      renter: string;
      host: string;
      asset: string;
      totalAmount: string;
      milestones: MilestoneDefinition[];
      /** Null when the escrow wasn't created against an off-chain listing. */
      listingId?: string | null;
    }
  | {
      type: 'escrow_funded';
      ledger: number;
      escrowId: number;
    }
  | {
      type: 'milestone_released';
      ledger: number;
      escrowId: number;
      milestoneIndex: number;
      escrowCompleted?: boolean;
    }
  | {
      type: 'dispute_opened';
      ledger: number;
      escrowId: number;
      milestoneIndex: number;
      openedBy: string;
      evidenceUri: string;
    }
  | {
      type: 'dispute_resolved';
      ledger: number;
      escrowId: number;
      milestoneIndex: number;
      outcome: 'renter_wins' | 'host_wins';
    }
  | {
      type: 'dispute_voted';
      ledger: number;
      escrowId: number;
      milestoneIndex: number;
      jurorWallet: string;
      voteForRenter: boolean;
    };

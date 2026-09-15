import { Injectable } from '@nestjs/common';
import { ChainEvent } from '../chain-event';
import { SorobanEventsPort } from '../ports/soroban-events.port';

/**
 * Deterministic in-memory fixture events, for exercising the indexer
 * pipeline end-to-end (cursor advance, event application, resolution
 * cascade) without a live Soroban RPC endpoint or a deployed contract.
 * Selected via INDEXER_MODE=mock (the default in development).
 */
@Injectable()
export class MockEventsAdapter implements SorobanEventsPort {
  private readonly fixtures: ChainEvent[] = [
    {
      type: 'escrow_created',
      ledger: 1,
      escrowId: 1,
      renter: 'GRENTERMOCKWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      host: 'GHOSTMOCKWALLETBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      asset: 'GASSETMOCKCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      totalAmount: '1000',
    },
    { type: 'escrow_funded', ledger: 2, escrowId: 1 },
    {
      type: 'milestone_released',
      ledger: 3,
      escrowId: 1,
      milestoneIndex: 0,
      escrowCompleted: false,
    },
  ];

  async fetchEventsSince(lastLedger: number): Promise<ChainEvent[]> {
    return this.fixtures.filter((event) => event.ledger > lastLedger);
  }
}

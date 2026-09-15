import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { ChainEvent, MilestoneDefinition } from '../chain-event';
import { SorobanEventsPort } from '../ports/soroban-events.port';

interface RawContractEvent {
  ledger: number;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

/**
 * Real Soroban RPC implementation of SorobanEventsPort. Assumes the
 * contract emits one topic (a Symbol naming the event, matching
 * ChainEvent['type']) plus a value that's a map of the event's fields —
 * adjust decodeEvent's field mapping to match the deployed contract's
 * actual event shape once one exists (none is deployed yet, see
 * ESCROW_CONTRACT_ID in .env.example).
 */
@Injectable()
export class SorobanRpcEventsAdapter implements SorobanEventsPort {
  private readonly logger = new Logger(SorobanRpcEventsAdapter.name);
  private readonly server: rpc.Server;
  private readonly contractId: string;

  constructor(config: ConfigService) {
    this.server = new rpc.Server(
      config.get<string>('SOROBAN_RPC_URL') ?? 'https://soroban-testnet.stellar.org',
    );
    this.contractId = config.get<string>('ESCROW_CONTRACT_ID') ?? '';
  }

  async fetchEventsSince(lastLedger: number): Promise<ChainEvent[]> {
    const response = await this.server.getEvents({
      startLedger: lastLedger + 1,
      filters: [{ type: 'contract', contractIds: [this.contractId] }],
    });

    const events: ChainEvent[] = [];
    for (const raw of response.events) {
      const decoded = this.decodeEvent(raw as unknown as RawContractEvent);
      if (decoded) {
        events.push(decoded);
      }
    }
    return events;
  }

  /** Pure decode step, exposed so it can be unit tested without a live RPC call. */
  decodeEvent(raw: RawContractEvent): ChainEvent | null {
    try {
      const eventType = scValToNative(raw.topic[0]) as string;
      const payload = scValToNative(raw.value) as Record<string, unknown>;

      switch (eventType) {
        case 'escrow_created':
          return {
            type: 'escrow_created',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
            renter: String(payload.renter),
            host: String(payload.host),
            asset: String(payload.asset),
            totalAmount: String(payload.totalAmount),
            milestones: this.decodeMilestones(payload.milestones),
          };
        case 'escrow_funded':
          return {
            type: 'escrow_funded',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
          };
        case 'milestone_released':
          return {
            type: 'milestone_released',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
            milestoneIndex: Number(payload.milestoneIndex),
            escrowCompleted: Boolean(payload.escrowCompleted),
          };
        case 'dispute_opened':
          return {
            type: 'dispute_opened',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
            milestoneIndex: Number(payload.milestoneIndex),
            openedBy: String(payload.openedBy),
            evidenceUri: String(payload.evidenceUri),
          };
        case 'dispute_voted':
          return {
            type: 'dispute_voted',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
            jurorWallet: String(payload.jurorWallet),
            voteForRenter: Boolean(payload.voteForRenter),
          };
        case 'dispute_resolved':
          return {
            type: 'dispute_resolved',
            ledger: raw.ledger,
            escrowId: Number(payload.escrowId),
            outcome: payload.outcome === 'renter_wins' ? 'renter_wins' : 'host_wins',
          };
        default:
          this.logger.warn(`unrecognized event type: ${eventType}`);
          return null;
      }
    } catch (err) {
      this.logger.error(
        'failed to decode contract event',
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
  }

  private decodeMilestones(raw: unknown): MilestoneDefinition[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((m: Record<string, unknown>, i) => ({
      index: Number(m.index ?? i),
      description: String(m.description),
      amount: String(m.amount),
      autoReleaseAt: m.autoReleaseAt ? String(m.autoReleaseAt) : undefined,
    }));
  }
}

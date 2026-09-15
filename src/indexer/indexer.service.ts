import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DisputesService } from '../disputes/disputes.service';
import { ChainEvent } from './chain-event';
import { IndexerRepository } from './indexer.repository';
import { SOROBAN_EVENTS_PORT, SorobanEventsPort } from './ports/soroban-events.port';

const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Polling indexer — not a subscription, the simplest thing that works at
 * testnet scale (see the port/adapter split in ports/adapters — that's
 * what makes this swappable for a proper event-streaming setup later
 * without touching the event-application logic below).
 */
@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private polling = false;

  constructor(
    @Inject(SOROBAN_EVENTS_PORT) private readonly eventsPort: SorobanEventsPort,
    private readonly indexer: IndexerRepository,
    private readonly disputes: DisputesService,
  ) {}

  @Interval(DEFAULT_POLL_INTERVAL_MS)
  async poll() {
    // Guards against overlapping runs if one iteration takes longer than
    // the interval — a single-flight poll, not a queue.
    if (this.polling) {
      return;
    }
    this.polling = true;
    try {
      await this.pollOnce();
    } catch (err) {
      this.logger.error('poll iteration failed', err instanceof Error ? err.stack : err);
    } finally {
      this.polling = false;
    }
  }

  async pollOnce(): Promise<number> {
    const lastLedger = await this.indexer.getLastLedger();
    const events = await this.eventsPort.fetchEventsSince(lastLedger);

    for (const event of events) {
      await this.applyEvent(event);
    }

    if (events.length > 0) {
      const newCursor = events[events.length - 1].ledger;
      await this.indexer.setLastLedger(newCursor);
    }

    return events.length;
  }

  private async applyEvent(event: ChainEvent): Promise<void> {
    switch (event.type) {
      case 'escrow_created':
        return this.indexer.createEscrow(
          event.escrowId,
          event.renter,
          event.host,
          event.asset,
          event.totalAmount,
        );
      case 'escrow_funded':
        return this.indexer.fundEscrow(event.escrowId);
      case 'milestone_released':
        await this.indexer.releaseMilestone(event.escrowId, event.milestoneIndex);
        if (event.escrowCompleted) {
          await this.indexer.completeEscrow(event.escrowId);
        }
        return;
      case 'dispute_opened':
        return this.indexer.openDispute(
          event.escrowId,
          event.milestoneIndex,
          event.openedBy,
          event.evidenceUri,
        );
      case 'dispute_voted':
        return this.disputes.recordVote(
          event.escrowId,
          event.jurorWallet,
          event.voteForRenter,
        );
      case 'dispute_resolved':
        return this.disputes.applyResolution(String(event.escrowId), event.outcome);
      default:
        this.logger.warn(`unrecognized event type: ${(event as ChainEvent).type}`);
    }
  }
}

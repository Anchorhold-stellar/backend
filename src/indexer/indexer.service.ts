import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DisputesService } from '../disputes/disputes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChainEvent } from './chain-event';
import { IndexerRepository } from './indexer.repository';
import { SOROBAN_EVENTS_PORT, SorobanEventsPort } from './ports/soroban-events.port';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const POLL_INTERVAL_NAME = 'indexer-poll';

/**
 * Polling indexer — not a subscription, the simplest thing that works at
 * testnet scale (see the port/adapter split in ports/adapters — that's
 * what makes this swappable for a proper event-streaming setup later
 * without touching the event-application logic below).
 *
 * The interval is registered dynamically in onModuleInit rather than via
 * a plain @Interval() decorator, since a decorator's argument is fixed at
 * class-definition time and can't read INDEXER_POLL_INTERVAL_MS from
 * ConfigService -- the original Express prototype read this env var;
 * hardcoding it here would have been a silent regression from the port.
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private polling = false;

  constructor(
    @Inject(SOROBAN_EVENTS_PORT) private readonly eventsPort: SorobanEventsPort,
    private readonly indexer: IndexerRepository,
    private readonly disputes: DisputesService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const intervalMs =
      Number(this.config.get<string>('INDEXER_POLL_INTERVAL_MS')) ||
      DEFAULT_POLL_INTERVAL_MS;
    const handle = setInterval(() => void this.poll(), intervalMs);
    this.scheduler.addInterval(POLL_INTERVAL_NAME, handle);
    this.logger.log(`polling every ${intervalMs}ms`);
  }

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
          event.milestones,
          event.listingId ?? null,
        );
      case 'escrow_funded':
        await this.indexer.fundEscrow(event.escrowId);
        await this.notifications.notify('escrow_funded', { escrowId: event.escrowId });
        return;
      case 'milestone_released':
        await this.indexer.releaseMilestone(event.escrowId, event.milestoneIndex);
        if (event.escrowCompleted) {
          await this.indexer.completeEscrow(event.escrowId);
        }
        return;
      case 'dispute_opened':
        await this.indexer.openDispute(
          event.escrowId,
          event.milestoneIndex,
          event.openedBy,
          event.evidenceUri,
        );
        await this.notifications.notify('dispute_opened', {
          escrowId: event.escrowId,
          milestoneIndex: event.milestoneIndex,
          openedBy: event.openedBy,
        });
        return;
      case 'dispute_voted':
        return this.disputes.recordVote(
          event.escrowId,
          event.milestoneIndex,
          event.jurorWallet,
          event.voteForRenter,
        );
      case 'dispute_resolved':
        await this.disputes.applyResolution(
          String(event.escrowId),
          event.milestoneIndex,
          event.outcome,
        );
        await this.notifications.notify('dispute_resolved', {
          escrowId: event.escrowId,
          milestoneIndex: event.milestoneIndex,
          outcome: event.outcome,
        });
        return;
      default:
        this.logger.warn(`unrecognized event type: ${(event as ChainEvent).type}`);
    }
  }
}

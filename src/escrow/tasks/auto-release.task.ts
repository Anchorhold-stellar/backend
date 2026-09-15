import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EscrowRepository } from '../escrow.repository';

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const POLL_INTERVAL_NAME = 'auto-release-poll';

/**
 * Milestones can carry an `auto_release_at` timestamp (set when the
 * milestone is created) meaning "release funds automatically if the
 * renter hasn't disputed by this time." Nothing previously enforced that
 * column — this task is the enforcement.
 *
 * The interval is registered dynamically in onModuleInit, the same
 * pattern IndexerService uses (see indexer/indexer.service.ts) and for
 * the same reason: a plain @Interval() decorator's argument is fixed at
 * class-definition time and can't read AUTO_RELEASE_POLL_INTERVAL_MS from
 * ConfigService.
 */
@Injectable()
export class AutoReleaseTask implements OnModuleInit {
  private readonly logger = new Logger(AutoReleaseTask.name);

  constructor(
    private readonly escrows: EscrowRepository,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const intervalMs =
      Number(this.config.get<string>('AUTO_RELEASE_POLL_INTERVAL_MS')) ||
      DEFAULT_POLL_INTERVAL_MS;
    const handle = setInterval(() => void this.run(), intervalMs);
    this.scheduler.addInterval(POLL_INTERVAL_NAME, handle);
    this.logger.log(`polling every ${intervalMs}ms`);
  }

  async run() {
    const due = await this.escrows.findDueMilestones();

    for (const milestone of due) {
      await this.escrows.releaseMilestone(milestone.id);
      this.logger.log(
        `auto-released milestone ${milestone.id} (escrow ${milestone.escrow_id})`,
      );

      if (await this.escrows.allMilestonesReleased(milestone.escrow_id)) {
        await this.escrows.updateStatus(milestone.escrow_id, 'completed');
      }
    }
  }
}

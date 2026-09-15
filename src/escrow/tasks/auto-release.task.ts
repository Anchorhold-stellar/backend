import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EscrowRepository } from '../escrow.repository';

const POLL_INTERVAL_MS = 60_000;

/**
 * Milestones can carry an `auto_release_at` timestamp (set when the
 * milestone is created) meaning "release funds automatically if the
 * renter hasn't disputed by this time." Nothing previously enforced that
 * column — this task is the enforcement.
 */
@Injectable()
export class AutoReleaseTask {
  private readonly logger = new Logger(AutoReleaseTask.name);

  constructor(private readonly escrows: EscrowRepository) {}

  @Interval(POLL_INTERVAL_MS)
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

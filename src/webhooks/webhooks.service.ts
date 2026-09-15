import { Injectable } from '@nestjs/common';
import { EscrowRepository } from '../escrow/escrow.repository';
import { KeeperPingDto } from './dto/keeper-ping.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly escrows: EscrowRepository) {}

  async keeperPing(dto: KeeperPingDto) {
    const escrowId = String(dto.escrowId);
    const released = await this.escrows.releaseMilestoneByIndex(
      escrowId,
      dto.milestoneIndex,
    );

    // Mirrors the completion cascade AutoReleaseTask and the indexer's
    // milestone_released handler both already do -- without it, an escrow
    // released entirely via keeper-ping would never transition to
    // 'completed', silently diverging from every other release path.
    if (released && (await this.escrows.allMilestonesReleased(escrowId))) {
      await this.escrows.updateStatus(escrowId, 'completed');
    }
  }
}

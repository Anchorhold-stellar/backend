import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { KeeperPingDto } from './dto/keeper-ping.dto';

/**
 * Generic inbound webhook for off-chain integrations — e.g. a keeper
 * service that calls `check_auto_release` on-chain and then pings this
 * endpoint so the read model updates without waiting for the next indexer
 * poll, or a notification provider confirming delivery.
 *
 * Keep this separate from the indexer: the indexer is the source of truth
 * for on-chain state; this endpoint is only for out-of-band signals that
 * don't come from contract events.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('keeper-ping')
  @HttpCode(204)
  async keeperPing(@Body() dto: KeeperPingDto) {
    if (dto.escrowId == null || dto.milestoneIndex == null) {
      throw new BadRequestException('escrowId and milestoneIndex required');
    }
    await this.webhooks.keeperPing(dto);
  }
}

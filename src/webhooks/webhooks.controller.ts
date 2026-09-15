import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { KeeperPingDto } from './dto/keeper-ping.dto';
import { HmacGuard } from './guards/hmac.guard';

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
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('keeper-ping')
  @HttpCode(204)
  @UseGuards(HmacGuard)
  async keeperPing(@Body() dto: KeeperPingDto) {
    await this.webhooks.keeperPing(dto);
  }
}

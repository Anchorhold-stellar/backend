import { Module } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { HmacGuard } from './guards/hmac.guard';

@Module({
  imports: [EscrowModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, HmacGuard],
})
export class WebhooksModule {}

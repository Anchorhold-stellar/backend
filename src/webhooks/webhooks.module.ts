import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { HmacGuard } from './guards/hmac.guard';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, HmacGuard],
})
export class WebhooksModule {}

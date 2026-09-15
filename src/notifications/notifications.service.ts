import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NotificationEvent =
  | 'escrow_funded'
  | 'dispute_opened'
  | 'dispute_resolved';

/**
 * Fans out key domain events to a single configurable outbound webhook —
 * e.g. a notification service that emails/pushes the affected parties.
 * Deliberately not a full pub/sub system: one URL, fire-and-forget, best
 * effort. A failed delivery is logged and swallowed — notification
 * delivery must never be able to fail indexer event processing.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webhookUrl?: string;

  constructor(config: ConfigService) {
    this.webhookUrl = config.get<string>('NOTIFICATIONS_WEBHOOK_URL');
  }

  async notify(event: NotificationEvent, payload: Record<string, unknown>): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload, sentAt: new Date().toISOString() }),
      });
      if (!response.ok) {
        this.logger.warn(`notification webhook returned ${response.status} for ${event}`);
      }
    } catch (err) {
      this.logger.warn(
        `failed to deliver ${event} notification: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

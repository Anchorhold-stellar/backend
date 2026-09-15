import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NotificationEvent =
  | 'escrow_funded'
  | 'dispute_opened'
  | 'dispute_resolved';

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Fans out key domain events to a single configurable outbound webhook —
 * e.g. a notification service that emails/pushes the affected parties.
 * Deliberately not a full pub/sub system: one URL, fire-and-forget, best
 * effort. A failed delivery is logged and swallowed — notification
 * delivery must never be able to fail indexer event processing.
 *
 * The indexer awaits notify() inline while applying each chain event
 * (see indexer/indexer.service.ts), so a webhook that hangs rather than
 * erroring -- an unresponsive host, a dropped connection with no
 * RST -- would stall event processing indefinitely without a timeout,
 * silently breaking the "must never fail indexer processing" guarantee.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webhookUrl?: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.webhookUrl = config.get<string>('NOTIFICATIONS_WEBHOOK_URL');
    this.timeoutMs =
      Number(config.get<string>('NOTIFICATIONS_WEBHOOK_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;
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
        signal: AbortSignal.timeout(this.timeoutMs),
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

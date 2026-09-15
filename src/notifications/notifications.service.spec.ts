import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does nothing when no webhook URL is configured', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const service = new NotificationsService(new ConfigService({}));

    await service.notify('escrow_funded', { escrowId: 1 });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the event and payload to the configured webhook', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as never;
    const service = new NotificationsService(
      new ConfigService({ NOTIFICATIONS_WEBHOOK_URL: 'https://example.com/hook' }),
    );

    await service.notify('dispute_opened', { escrowId: 42 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ event: 'dispute_opened', payload: { escrowId: 42 } });
  });

  it('swallows a network failure rather than throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;
    const service = new NotificationsService(
      new ConfigService({ NOTIFICATIONS_WEBHOOK_URL: 'https://example.com/hook' }),
    );

    await expect(service.notify('dispute_resolved', {})).resolves.toBeUndefined();
  });

  it('swallows a non-2xx response rather than throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never;
    const service = new NotificationsService(
      new ConfigService({ NOTIFICATIONS_WEBHOOK_URL: 'https://example.com/hook' }),
    );

    await expect(service.notify('dispute_resolved', {})).resolves.toBeUndefined();
  });
});

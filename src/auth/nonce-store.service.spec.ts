import { ConfigService } from '@nestjs/config';
import { NonceStoreService } from './nonce-store.service';

describe('NonceStoreService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the issued nonce via peek before it expires', () => {
    const store = new NonceStoreService(new ConfigService({ AUTH_NONCE_TTL_MS: 1000 }));
    const { nonce } = store.issue('GWALLET');

    expect(store.peek('GWALLET')).toBe(nonce);
  });

  it('expires the nonce after the configured TTL', () => {
    jest.useFakeTimers();
    const store = new NonceStoreService(new ConfigService({ AUTH_NONCE_TTL_MS: 1000 }));
    store.issue('GWALLET');

    jest.advanceTimersByTime(1001);

    expect(store.peek('GWALLET')).toBeNull();
  });

  it('consume() removes the nonce so a second peek returns null', () => {
    const store = new NonceStoreService(new ConfigService({ AUTH_NONCE_TTL_MS: 60_000 }));
    store.issue('GWALLET');

    store.consume('GWALLET');

    expect(store.peek('GWALLET')).toBeNull();
  });

  it('peek() for a wallet with no issued challenge returns null', () => {
    const store = new NonceStoreService(new ConfigService({}));

    expect(store.peek('GNEVER-ISSUED')).toBeNull();
  });

  it('re-issuing overwrites any previous nonce for that wallet', () => {
    const store = new NonceStoreService(new ConfigService({ AUTH_NONCE_TTL_MS: 60_000 }));
    const first = store.issue('GWALLET');
    const second = store.issue('GWALLET');

    expect(first.nonce).not.toBe(second.nonce);
    expect(store.peek('GWALLET')).toBe(second.nonce);
  });
});

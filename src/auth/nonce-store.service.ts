import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

interface StoredNonce {
  nonce: string;
  expiresAt: number;
}

/**
 * In-memory challenge store, sized for a single backend instance. If this
 * ever runs behind multiple instances/processes, replace with a shared
 * store (e.g. an `auth_nonces` table or Redis) — deliberately out of scope
 * for this milestone.
 */
@Injectable()
export class NonceStoreService {
  private readonly nonces = new Map<string, StoredNonce>();
  private readonly ttlMs: number;

  constructor(config: ConfigService) {
    // ConfigService.get<number>() doesn't coerce -- it returns the raw env
    // string with a type assertion. Date.now() + "300000" is string
    // concatenation, not addition, which would make expiresAt an enormous
    // string that never compares as "in the past" -- nonces would never
    // expire. Number() it explicitly.
    this.ttlMs = Number(config.get<string>('AUTH_NONCE_TTL_MS')) || 5 * 60 * 1000;
  }

  issue(wallet: string): StoredNonce {
    const entry: StoredNonce = {
      nonce: randomBytes(32).toString('hex'),
      expiresAt: Date.now() + this.ttlMs,
    };
    this.nonces.set(wallet, entry);
    return entry;
  }

  /** Returns the nonce for a wallet without consuming it, or null if absent/expired. */
  peek(wallet: string): string | null {
    const entry = this.nonces.get(wallet);
    if (!entry || entry.expiresAt < Date.now()) {
      this.nonces.delete(wallet);
      return null;
    }
    return entry.nonce;
  }

  /** Consumes (deletes) the nonce so a signature can't be replayed. */
  consume(wallet: string): void {
    this.nonces.delete(wallet);
  }
}

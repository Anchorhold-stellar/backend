import { ChainEvent } from '../chain-event';

export const SOROBAN_EVENTS_PORT = 'SOROBAN_EVENTS_PORT';

export interface SorobanEventsPort {
  /** Returns contract events with ledger > lastLedger, oldest first. */
  fetchEventsSince(lastLedger: number): Promise<ChainEvent[]>;
}

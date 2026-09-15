export type ScValType = 'address' | 'u32' | 'bool' | 'string' | 'raw';

export interface ContractMethodSchema {
  /** Name of the method as exposed on the deployed contract. */
  method: string;
  /** Expected type of each positional argument, in order. */
  args: ScValType[];
  /**
   * True when the contract method itself requires no wallet-specific
   * authorization (e.g. resolve_dispute, callable by anyone once voting is
   * complete). The transaction still needs a fee-paying source account —
   * Stellar has no concept of a sourceless transaction — but that source is
   * not passed to the contract as an auth argument.
   */
  permissionless?: boolean;
}

// Explicit per-method arg schemas, matching the escrow contract's
// signatures 1:1. Deliberately replaces guessing an ScVal type from a JS
// value's runtime type — that heuristic breaks silently the moment a
// method takes two arguments of different types that happen to share a JS
// type (e.g. two numbers that are actually a u32 and an i128).
export const CONTRACT_METHODS: Record<string, ContractMethodSchema> = {
  create_escrow: {
    method: 'create_escrow',
    args: ['address', 'address', 'address', 'raw'],
  },
  deposit: {
    method: 'deposit',
    args: ['address', 'u32'],
  },
  confirm_milestone: {
    method: 'confirm_milestone',
    args: ['address', 'u32', 'u32'],
  },
  raise_dispute: {
    method: 'raise_dispute',
    args: ['address', 'u32', 'u32', 'string'],
  },
  vote_dispute: {
    method: 'vote_dispute',
    args: ['address', 'u32', 'bool'],
  },
  resolve_dispute: {
    method: 'resolve_dispute',
    args: ['u32'],
    permissionless: true,
  },
  cancel_escrow: {
    method: 'cancel_escrow',
    args: ['address', 'u32'],
  },
};

export type ContractMethodName = keyof typeof CONTRACT_METHODS;

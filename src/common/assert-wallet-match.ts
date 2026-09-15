import { ForbiddenException } from '@nestjs/common';

/**
 * Confirms the wallet authenticated by WalletAuthGuard is the same wallet
 * the request body claims to be acting as. WalletAuthGuard only proves
 * *some* wallet signed the challenge — this closes the gap between "a
 * valid signature" and "the signature of the party this request is about".
 */
export function assertWalletMatches(claimed: string, authenticated: string) {
  if (claimed !== authenticated) {
    throw new ForbiddenException(
      'authenticated wallet does not match the wallet on this request',
    );
  }
}

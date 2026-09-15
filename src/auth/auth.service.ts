import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { NonceStoreService } from './nonce-store.service';

@Injectable()
export class AuthService {
  constructor(private readonly nonces: NonceStoreService) {}

  issueChallenge(wallet: string) {
    const { nonce, expiresAt } = this.nonces.issue(wallet);
    return { nonce, expiresAt };
  }

  /**
   * Verifies that `signature` (base64) is the wallet's signature over the
   * nonce currently issued for it, then consumes the nonce so it can't be
   * replayed. Throws if there's no live challenge or the signature doesn't
   * match.
   */
  verifySignature(wallet: string, signature: string): void {
    const nonce = this.nonces.peek(wallet);
    if (!nonce) {
      throw new UnauthorizedException('no active challenge for this wallet');
    }

    let verified: boolean;
    try {
      const keypair = Keypair.fromPublicKey(wallet);
      verified = keypair.verify(
        Buffer.from(nonce, 'utf8'),
        Buffer.from(signature, 'base64'),
      );
    } catch {
      verified = false;
    }

    if (!verified) {
      throw new UnauthorizedException('invalid wallet signature');
    }

    this.nonces.consume(wallet);
  }
}

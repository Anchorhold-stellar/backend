import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from './auth.service';
import { NonceStoreService } from './nonce-store.service';

describe('AuthService', () => {
  function makeService() {
    const config = new ConfigService({});
    const nonces = new NonceStoreService(config);
    return { auth: new AuthService(nonces), nonces };
  }

  it('accepts a signature over the issued nonce and consumes it', () => {
    const { auth } = makeService();
    const kp = Keypair.random();

    const { nonce } = auth.issueChallenge(kp.publicKey());
    const signature = kp.sign(Buffer.from(nonce, 'utf8')).toString('base64');

    expect(() => auth.verifySignature(kp.publicKey(), signature)).not.toThrow();
    // Nonce is single-use: verifying again with the same signature must fail.
    expect(() => auth.verifySignature(kp.publicKey(), signature)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a signature from the wrong wallet', () => {
    const { auth } = makeService();
    const kp = Keypair.random();
    const impostor = Keypair.random();

    const { nonce } = auth.issueChallenge(kp.publicKey());
    const signature = impostor.sign(Buffer.from(nonce, 'utf8')).toString('base64');

    expect(() => auth.verifySignature(kp.publicKey(), signature)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects verification when no challenge was issued', () => {
    const { auth } = makeService();
    const kp = Keypair.random();

    expect(() => auth.verifySignature(kp.publicKey(), 'bm90LWEtcmVhbC1zaWc=')).toThrow(
      UnauthorizedException,
    );
  });
});

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

export interface AuthenticatedRequest extends Request {
  wallet: string;
}

/**
 * Verifies the caller controls the private key for the wallet it claims to
 * act as, via the challenge/verify flow in AuthService. Expects headers:
 *   X-Wallet-Address:   the Stellar G... public key
 *   X-Wallet-Signature: base64 signature over the nonce from GET /auth/challenge
 */
@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const wallet = request.header('x-wallet-address');
    const signature = request.header('x-wallet-signature');

    if (!wallet || !signature) {
      throw new UnauthorizedException(
        'X-Wallet-Address and X-Wallet-Signature headers are required',
      );
    }

    this.auth.verifySignature(wallet, signature);
    request.wallet = wallet;
    return true;
  }
}

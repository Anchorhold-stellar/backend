import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Verifies POST /webhooks/keeper-ping requests carry a valid
 * `X-Keeper-Signature: sha256=<hex hmac>` header over the raw request
 * body, computed with KEEPER_WEBHOOK_SECRET. Without this, anyone who can
 * reach the endpoint could mark arbitrary milestones released.
 */
@Injectable()
export class HmacGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const header = request.header('x-keeper-signature');
    const secret = this.config.get<string>('KEEPER_WEBHOOK_SECRET');

    if (!secret) {
      throw new UnauthorizedException('webhook signing secret is not configured');
    }
    if (!header || !header.startsWith('sha256=')) {
      throw new UnauthorizedException('missing or malformed X-Keeper-Signature header');
    }
    if (!request.rawBody) {
      throw new UnauthorizedException('raw body unavailable for signature verification');
    }

    const expected = createHmac('sha256', secret).update(request.rawBody).digest('hex');
    const provided = header.slice('sha256='.length);

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');

    const valid =
      expectedBuf.length === providedBuf.length &&
      timingSafeEqual(expectedBuf, providedBuf);

    if (!valid) {
      throw new UnauthorizedException('invalid webhook signature');
    }

    return true;
  }
}

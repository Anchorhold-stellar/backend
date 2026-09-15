import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChallengeQueryDto } from './dto/challenge-query.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Nonce issuance is free (no auth required, by design) and each call
  // occupies a slot in the in-memory nonce store — a tighter limit than
  // the app-wide default keeps that from becoming a cheap way to spam
  // memory or lock other wallets out of retrying a challenge.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get('challenge')
  challenge(@Query() query: ChallengeQueryDto) {
    return this.auth.issueChallenge(query.wallet);
  }
}

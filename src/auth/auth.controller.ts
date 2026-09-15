import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChallengeQueryDto } from './dto/challenge-query.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('challenge')
  challenge(@Query() query: ChallengeQueryDto) {
    return this.auth.issueChallenge(query.wallet);
  }
}

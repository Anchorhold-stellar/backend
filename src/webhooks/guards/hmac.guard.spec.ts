import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { HmacGuard } from './hmac.guard';

function makeContext(headers: Record<string, string>, rawBody: Buffer | undefined) {
  const request = {
    header: (name: string) => headers[name.toLowerCase()],
    rawBody,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('HmacGuard', () => {
  const secret = 'test-secret';
  const config = new ConfigService({ KEEPER_WEBHOOK_SECRET: secret });
  const guard = new HmacGuard(config);

  function sign(body: Buffer) {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  it('accepts a request with a valid signature over the raw body', () => {
    const body = Buffer.from('{"escrowId":1,"milestoneIndex":0}');
    const ctx = makeContext({ 'x-keeper-signature': sign(body) }, body);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a missing signature header', () => {
    const body = Buffer.from('{}');
    const ctx = makeContext({}, body);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a tampered body', () => {
    const originalBody = Buffer.from('{"escrowId":1,"milestoneIndex":0}');
    const tamperedBody = Buffer.from('{"escrowId":1,"milestoneIndex":999}');
    const ctx = makeContext({ 'x-keeper-signature': sign(originalBody) }, tamperedBody);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest, WalletAuthGuard } from './wallet-auth.guard';

function makeContext(headers: Record<string, string>) {
  const request = {
    header: (name: string) => headers[name.toLowerCase()],
  } as AuthenticatedRequest;
  return {
    context: { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext,
    request,
  };
}

describe('WalletAuthGuard', () => {
  it('rejects a request with no wallet/signature headers', () => {
    const auth = { verifySignature: jest.fn() };
    const guard = new WalletAuthGuard(auth as never);
    const { context } = makeContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(auth.verifySignature).not.toHaveBeenCalled();
  });

  it('rejects a request missing only the signature header', () => {
    const auth = { verifySignature: jest.fn() };
    const guard = new WalletAuthGuard(auth as never);
    const { context } = makeContext({ 'x-wallet-address': 'GWALLET' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('delegates to AuthService.verifySignature and attaches the wallet to the request', () => {
    const auth = { verifySignature: jest.fn() };
    const guard = new WalletAuthGuard(auth as never);
    const { context, request } = makeContext({
      'x-wallet-address': 'GWALLET',
      'x-wallet-signature': 'c2ln',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(auth.verifySignature).toHaveBeenCalledWith('GWALLET', 'c2ln');
    expect(request.wallet).toBe('GWALLET');
  });

  it('propagates AuthService.verifySignature rejections', () => {
    const auth = {
      verifySignature: jest.fn(() => {
        throw new UnauthorizedException('invalid wallet signature');
      }),
    };
    const guard = new WalletAuthGuard(auth as never);
    const { context } = makeContext({
      'x-wallet-address': 'GWALLET',
      'x-wallet-signature': 'bad-sig',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

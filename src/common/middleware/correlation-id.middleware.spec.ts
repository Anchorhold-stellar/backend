import { CorrelationIdMiddleware, RequestWithCorrelationId } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  function makeReqRes(incomingHeader?: string) {
    const headers: Record<string, string> = {};
    const req = {
      header: (name: string) => (name.toLowerCase() === 'x-request-id' ? incomingHeader : undefined),
    } as RequestWithCorrelationId;
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as never;
    return { req, res, headers };
  }

  it('reuses an inbound X-Request-Id if present', () => {
    const { req, res, headers } = makeReqRes('client-supplied-id');
    const middleware = new CorrelationIdMiddleware();

    middleware.use(req, res, () => undefined);

    expect(req.correlationId).toBe('client-supplied-id');
    expect(headers['X-Request-Id']).toBe('client-supplied-id');
  });

  it('mints a new id when none is supplied', () => {
    const { req, res, headers } = makeReqRes(undefined);
    const middleware = new CorrelationIdMiddleware();

    middleware.use(req, res, () => undefined);

    expect(req.correlationId).toBeTruthy();
    expect(headers['X-Request-Id']).toBe(req.correlationId);
  });

  it('calls next()', () => {
    const { req, res } = makeReqRes(undefined);
    const middleware = new CorrelationIdMiddleware();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

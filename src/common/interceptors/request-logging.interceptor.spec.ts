import { EventEmitter } from 'events';
import { of, throwError } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  function makeRequest(overrides: Record<string, unknown> = {}) {
    return { method: 'GET', originalUrl: '/v1/test', correlationId: 'corr-1', ...overrides };
  }

  function makeResponse() {
    const res = new EventEmitter() as EventEmitter & { statusCode: number };
    res.statusCode = 200;
    return res;
  }

  function makeContext(req: unknown, res: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as never;
  }

  it('logs the status as it stands when the response actually finishes, not when the handler observable settles', () => {
    // Regression test: AllExceptionsFilter maps a thrown exception to a
    // real res.statusCode *after* this interceptor's own handler
    // observable has already errored -- reading res.statusCode at that
    // earlier point always saw Express's still-default 200, so every
    // error response got logged as if it were a 200. This reproduces
    // that exact ordering: the observable errors and is subscribed to
    // first; the real status is only set afterward, right before
    // 'finish' fires, the same as the real app.
    const req = makeRequest();
    const res = makeResponse();
    const interceptor = new RequestLoggingInterceptor();
    const logSpy = jest
      .spyOn(interceptor['logger'], 'log')
      .mockImplementation(() => undefined as never);

    const next = { handle: () => throwError(() => new Error('boom')) };
    interceptor
      .intercept(makeContext(req, res), next as never)
      .subscribe({ error: () => undefined });

    expect(res.statusCode).toBe(200); // nothing has written the real status yet
    res.statusCode = 404; // AllExceptionsFilter runs here, in the real app
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /v1/test 404'));
  });

  it('logs the status code on a successful response', () => {
    const req = makeRequest({ originalUrl: '/v1/ok' });
    const res = makeResponse();
    const interceptor = new RequestLoggingInterceptor();
    const logSpy = jest
      .spyOn(interceptor['logger'], 'log')
      .mockImplementation(() => undefined as never);

    const next = { handle: () => of({ ok: true }) };
    interceptor.intercept(makeContext(req, res), next as never).subscribe();
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /v1/ok 200'));
  });
});

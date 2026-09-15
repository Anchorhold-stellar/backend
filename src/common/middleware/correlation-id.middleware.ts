import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

/**
 * Accepts an inbound X-Request-Id (so a gateway/load balancer's id
 * survives end to end) or mints a new one, and always echoes it back on
 * the response — the same value threads through log lines for this
 * request via RequestLoggingInterceptor.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    req.correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.correlationId);
    next();
  }
}

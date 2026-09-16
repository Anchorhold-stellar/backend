import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithCorrelationId>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    // res.statusCode isn't the real final status until the response has
    // actually been written: on the error path, AllExceptionsFilter runs
    // *after* this interceptor's own handler observable errors, so
    // reading res.statusCode from a tap({error}) callback would always
    // see Express's still-default 200, not whatever status the filter
    // goes on to send. The 'finish' event fires once headers + body are
    // fully sent, on both the success and error paths, so res.statusCode
    // is guaranteed correct by then.
    res.on('finish', () => this.log(req, res.statusCode, start));

    return next.handle();
  }

  private log(req: RequestWithCorrelationId, statusCode: number, start: number): void {
    const ms = Date.now() - start;
    this.logger.log(
      `${req.method} ${req.originalUrl} ${statusCode} ${ms}ms [${req.correlationId}]`,
    );
  }
}

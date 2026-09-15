import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithCorrelationId>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, res.statusCode, start),
        error: () => this.log(req, res.statusCode || 500, start),
      }),
    );
  }

  private log(req: RequestWithCorrelationId, statusCode: number, start: number): void {
    const ms = Date.now() - start;
    this.logger.log(
      `${req.method} ${req.originalUrl} ${statusCode} ${ms}ms [${req.correlationId}]`,
    );
  }
}

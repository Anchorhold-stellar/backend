import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeys);
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [
        toCamel(key),
        camelCaseKeys(v),
      ]),
    );
  }
  return value;
}

/**
 * Repositories return raw Postgres rows (snake_case columns) directly as
 * response bodies. Rather than hand-mapping every repository method to a
 * camelCase view model, this normalizes the wire format once, globally —
 * API consumers always see camelCase, regardless of the column names
 * behind any given endpoint.
 */
@Injectable()
export class CamelCaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => camelCaseKeys(data)));
  }
}

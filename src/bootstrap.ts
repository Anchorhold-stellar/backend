import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CamelCaseInterceptor } from './common/interceptors/camel-case.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

/**
 * Global pipes/filters/interceptors/versioning applied to the HTTP app.
 * Shared between main.ts and e2e test bootstrapping so tests exercise the
 * same request pipeline production requests actually go through — e2e
 * tests build their own NestApplication instance via @nestjs/testing
 * rather than calling main.ts's bootstrap(), so anything configured only
 * in main.ts (like versioning) would silently not apply to them.
 */
export function applyGlobalMiddleware(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor(), new CamelCaseInterceptor());
}

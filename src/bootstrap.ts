import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CamelCaseInterceptor } from './common/interceptors/camel-case.interceptor';

/**
 * Global pipes/filters/interceptors applied to the HTTP app. Shared
 * between main.ts and e2e test bootstrapping so tests exercise the same
 * middleware stack production requests actually go through.
 */
export function applyGlobalMiddleware(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new CamelCaseInterceptor());
}

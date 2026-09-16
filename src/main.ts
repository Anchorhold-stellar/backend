import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { applyGlobalMiddleware } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Unset (default) reflects the request origin, i.e. allow-all -- the
  // same behavior as a bare enableCors(). Set to a comma-separated list
  // to restrict it in production.
  const corsOrigin = app.get(ConfigService).get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
  });
  app.enableShutdownHooks();
  // Swagger UI at /docs needs inline scripts/styles; helmet's default CSP
  // would block them. This is a JSON API whose only served HTML page is
  // the docs UI itself, so disabling CSP globally is the simplest correct
  // tradeoff here rather than hand-tuning a policy for one route.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  applyGlobalMiddleware(app);

  const config = new DocumentBuilder()
    .setTitle('AnchorHold API')
    .setDescription(
      'Stellar/Soroban-based escrow and dispute-resolution marketplace backend.',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-Wallet-Address', in: 'header' },
      'wallet-address',
    )
    .addApiKey(
      { type: 'apiKey', name: 'X-Wallet-Signature', in: 'header' },
      'wallet-signature',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
}

bootstrap();

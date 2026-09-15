import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { applyGlobalMiddleware } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  applyGlobalMiddleware(app);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
}

bootstrap();

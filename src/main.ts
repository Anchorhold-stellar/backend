import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobalMiddleware } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  applyGlobalMiddleware(app);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
}

bootstrap();

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IndexerAppModule } from './indexer-app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(IndexerAppModule);
  app.enableShutdownHooks();

  const logger = new Logger('IndexerBootstrap');
  const mode = process.env.INDEXER_MODE === 'live' ? 'live' : 'mock';
  logger.log(
    `watching contract ${process.env.ESCROW_CONTRACT_ID} on ${process.env.SOROBAN_RPC_URL} (mode: ${mode})`,
  );
}

bootstrap();

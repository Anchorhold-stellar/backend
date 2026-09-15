import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { IndexerModule } from './indexer.module';
import { validateEnv } from '../config/env.validation';

/**
 * Minimal root module for the standalone indexer process (see
 * indexer.main.ts) — deliberately narrower than the HTTP AppModule, since
 * the indexer has no business pulling in Listings/Jurors/Webhooks.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    IndexerModule,
  ],
})
export class IndexerAppModule {}

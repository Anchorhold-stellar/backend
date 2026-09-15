import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { SorobanModule } from './soroban/soroban.module';
import { EscrowModule } from './escrow/escrow.module';
import { DisputesModule } from './disputes/disputes.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ListingsModule } from './listings/listings.module';
import { AuthModule } from './auth/auth.module';
import { JurorsModule } from './jurors/jurors.module';
import { ReputationModule } from './reputation/reputation.module';
import { HealthModule } from './health/health.module';
import { IndexerStatusModule } from './indexer-status/indexer-status.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { validateEnv } from './config/env.validation';

// Note: IndexerModule (the actual polling loop) is intentionally NOT
// imported here. It runs as its own process via `npm run start:indexer`
// (see src/indexer/indexer.main.ts), matching the original design —
// polling and applying chain events is kept out of the HTTP request path,
// and importing it here too would mean two pollers racing over the same
// indexer_cursor row. IndexerStatusModule is a separate, read-only module
// that just reports on that same row (see GET /indexer/status).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      // ConfigService returns raw env strings, not numbers -- Number()
      // them explicitly, since {ttl: "30000"} silently does the wrong
      // thing rather than erroring.
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get<string>('THROTTLE_TTL_MS')) || 60_000,
          limit: Number(config.get<string>('THROTTLE_LIMIT')) || 120,
        },
      ],
    }),
    DatabaseModule,
    SorobanModule,
    EscrowModule,
    DisputesModule,
    WebhooksModule,
    ListingsModule,
    AuthModule,
    JurorsModule,
    ReputationModule,
    HealthModule,
    IndexerStatusModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

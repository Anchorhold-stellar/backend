import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { validateEnv } from './config/env.validation';

// Note: IndexerModule is intentionally NOT imported here. It runs as its
// own process via `npm run start:indexer` (see src/indexer/indexer.main.ts),
// matching the original design — polling and applying chain events is kept
// out of the HTTP request path, and importing it here too would mean two
// pollers racing over the same indexer_cursor row.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SorobanModule,
    EscrowModule,
    DisputesModule,
    WebhooksModule,
    ListingsModule,
    AuthModule,
    JurorsModule,
    ReputationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

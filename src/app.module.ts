import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { SorobanModule } from './soroban/soroban.module';
import { EscrowModule } from './escrow/escrow.module';
import { DisputesModule } from './disputes/disputes.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ListingsModule } from './listings/listings.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    SorobanModule,
    EscrowModule,
    DisputesModule,
    WebhooksModule,
    ListingsModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

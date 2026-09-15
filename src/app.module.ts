import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { SorobanModule } from './soroban/soroban.module';
import { EscrowModule } from './escrow/escrow.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    SorobanModule,
    EscrowModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

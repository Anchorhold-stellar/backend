import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NonceStoreService } from './nonce-store.service';
import { WalletAuthGuard } from './guards/wallet-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, NonceStoreService, WalletAuthGuard],
  exports: [WalletAuthGuard],
})
export class AuthModule {}

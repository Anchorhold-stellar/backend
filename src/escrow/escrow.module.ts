import { Module } from '@nestjs/common';
import { SorobanModule } from '../soroban/soroban.module';
import { AuthModule } from '../auth/auth.module';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { EscrowRepository } from './escrow.repository';

@Module({
  imports: [SorobanModule, AuthModule],
  controllers: [EscrowController],
  providers: [EscrowService, EscrowRepository],
  exports: [EscrowRepository],
})
export class EscrowModule {}

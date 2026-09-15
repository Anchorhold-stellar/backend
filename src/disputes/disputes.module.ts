import { Module } from '@nestjs/common';
import { SorobanModule } from '../soroban/soroban.module';
import { AuthModule } from '../auth/auth.module';
import { EscrowModule } from '../escrow/escrow.module';
import { ReputationModule } from '../reputation/reputation.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputesRepository } from './disputes.repository';

@Module({
  imports: [SorobanModule, AuthModule, EscrowModule, ReputationModule],
  controllers: [DisputesController],
  providers: [DisputesService, DisputesRepository],
  exports: [DisputesRepository, DisputesService],
})
export class DisputesModule {}

import { Module } from '@nestjs/common';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { ReputationRepository } from './reputation.repository';

@Module({
  controllers: [ReputationController],
  providers: [ReputationService, ReputationRepository],
  exports: [ReputationService],
})
export class ReputationModule {}

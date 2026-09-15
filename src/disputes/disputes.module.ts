import { Module } from '@nestjs/common';
import { SorobanModule } from '../soroban/soroban.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputesRepository } from './disputes.repository';

@Module({
  imports: [SorobanModule],
  controllers: [DisputesController],
  providers: [DisputesService, DisputesRepository],
  exports: [DisputesRepository],
})
export class DisputesModule {}

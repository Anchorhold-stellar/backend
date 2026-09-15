import { Module } from '@nestjs/common';
import { SorobanModule } from '../soroban/soroban.module';
import { AuthModule } from '../auth/auth.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputesRepository } from './disputes.repository';

@Module({
  imports: [SorobanModule, AuthModule],
  controllers: [DisputesController],
  providers: [DisputesService, DisputesRepository],
  exports: [DisputesRepository],
})
export class DisputesModule {}

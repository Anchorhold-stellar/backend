import { Module } from '@nestjs/common';
import { DisputesModule } from '../disputes/disputes.module';
import { IndexerRepository } from './indexer.repository';
import { IndexerService } from './indexer.service';
import { MockEventsAdapter } from './adapters/mock-events.adapter';
import { SOROBAN_EVENTS_PORT } from './ports/soroban-events.port';

@Module({
  imports: [DisputesModule],
  providers: [
    IndexerRepository,
    IndexerService,
    { provide: SOROBAN_EVENTS_PORT, useClass: MockEventsAdapter },
  ],
  exports: [IndexerService],
})
export class IndexerModule {}

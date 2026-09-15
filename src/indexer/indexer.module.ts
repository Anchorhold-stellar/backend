import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputesModule } from '../disputes/disputes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IndexerRepository } from './indexer.repository';
import { IndexerService } from './indexer.service';
import { MockEventsAdapter } from './adapters/mock-events.adapter';
import { SorobanRpcEventsAdapter } from './adapters/soroban-rpc-events.adapter';
import { SOROBAN_EVENTS_PORT } from './ports/soroban-events.port';

@Module({
  imports: [DisputesModule, NotificationsModule],
  providers: [
    IndexerRepository,
    IndexerService,
    MockEventsAdapter,
    SorobanRpcEventsAdapter,
    {
      provide: SOROBAN_EVENTS_PORT,
      inject: [ConfigService, MockEventsAdapter, SorobanRpcEventsAdapter],
      useFactory: (
        config: ConfigService,
        mock: MockEventsAdapter,
        live: SorobanRpcEventsAdapter,
      ) => (config.get<string>('INDEXER_MODE') === 'live' ? live : mock),
    },
  ],
  exports: [IndexerService],
})
export class IndexerModule {}

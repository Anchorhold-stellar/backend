import { Module } from '@nestjs/common';
import { IndexerStatusController } from './indexer-status.controller';
import { IndexerStatusService } from './indexer-status.service';
import { IndexerStatusRepository } from './indexer-status.repository';

@Module({
  controllers: [IndexerStatusController],
  providers: [IndexerStatusService, IndexerStatusRepository],
})
export class IndexerStatusModule {}

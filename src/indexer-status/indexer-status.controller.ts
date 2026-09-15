import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IndexerStatusService } from './indexer-status.service';

/**
 * Deliberately reads indexer_cursor directly rather than importing
 * IndexerModule -- the HTTP app doesn't run the indexer's polling loop
 * (see app.module.ts), and pulling in IndexerModule here just to read one
 * row would drag in its whole dependency graph (Disputes/Escrow/Soroban/
 * mock-or-live adapter selection) for no reason.
 */
@ApiTags('indexer')
@Controller('indexer')
export class IndexerStatusController {
  constructor(private readonly status: IndexerStatusService) {}

  @Get('status')
  getStatus() {
    return this.status.getStatus();
  }
}

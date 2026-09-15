import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';

const HEAP_THRESHOLD_BYTES = 300 * 1024 * 1024; // 300MB

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  // Distinct from GET /health (liveness, no dependencies — see
  // AppController): this is a readiness check, confirming the app can
  // actually reach Postgres and isn't already leaking memory, not just
  // that the process is up.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', HEAP_THRESHOLD_BYTES),
    ]);
  }
}

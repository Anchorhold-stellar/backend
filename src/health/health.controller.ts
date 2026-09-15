import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  // Distinct from GET /health (liveness, no dependencies — see
  // AppController): this is a readiness check, confirming the app can
  // actually reach Postgres, not just that the process is up.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.isHealthy('database')]);
  }
}

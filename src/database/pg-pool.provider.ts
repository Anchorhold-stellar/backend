import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

const logger = new Logger('Database');

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const pool = new Pool({
      connectionString: config.get<string>('DATABASE_URL'),
    });

    pool.on('error', (err) => {
      // A dropped connection here shouldn't crash the process — log and let
      // the pool reconnect on the next query.
      logger.error('unexpected pool error', err);
    });

    return pool;
  },
};

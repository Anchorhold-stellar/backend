/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE listings ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX idx_listings_not_deleted ON listings (created_at) WHERE deleted_at IS NULL;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_listings_not_deleted;
    ALTER TABLE listings DROP COLUMN IF EXISTS deleted_at;
  `);
};

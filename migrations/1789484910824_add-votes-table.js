/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE votes (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      escrow_id         INTEGER NOT NULL REFERENCES disputes(escrow_id),
      juror_wallet      TEXT NOT NULL,
      vote_for_renter   BOOLEAN NOT NULL,
      voted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (escrow_id, juror_wallet)
    );

    CREATE INDEX idx_votes_escrow ON votes (escrow_id);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS votes;`);
};

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Bilateral post-completion reviews: after an escrow completes, the renter
 * and host can each rate the other (1-5 stars plus an optional comment).
 * One review per (escrow, reviewer) pair — the UNIQUE constraint makes a
 * second POST from the same side a conflict rather than a duplicate row.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS reviews (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      escrow_id     INTEGER NOT NULL REFERENCES escrows(escrow_id),
      reviewer_wallet TEXT NOT NULL,
      reviewee_wallet TEXT NOT NULL,
      rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (escrow_id, reviewer_wallet)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews (reviewee_wallet);
    CREATE INDEX IF NOT EXISTS idx_reviews_escrow ON reviews (escrow_id);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_reviews_escrow;
    DROP INDEX IF EXISTS idx_reviews_reviewee;
    DROP TABLE IF EXISTS reviews;
  `);
};

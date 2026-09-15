/* eslint-disable */

/**
 * The disputes/dispute_evidence/votes tables were originally keyed by
 * escrow_id alone, but milestones (added separately) made it possible
 * for an escrow to have several independent milestones, each with its
 * own dispute over the escrow's lifetime. With disputes.escrow_id as a
 * plain PRIMARY KEY, IndexerRepository.openDispute()'s
 * `ON CONFLICT (escrow_id) DO NOTHING` meant a genuinely new dispute on
 * a different milestone of an escrow that already had one (even a long-
 * resolved one) was silently dropped -- never indexed, no error. This
 * widens the key to (escrow_id, milestone_index) throughout.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE dispute_evidence DROP CONSTRAINT dispute_evidence_escrow_id_fkey;
    ALTER TABLE votes DROP CONSTRAINT votes_escrow_id_fkey;
    ALTER TABLE votes DROP CONSTRAINT votes_escrow_id_juror_wallet_key;
    ALTER TABLE disputes DROP CONSTRAINT disputes_pkey;

    ALTER TABLE disputes ADD PRIMARY KEY (escrow_id, milestone_index);

    ALTER TABLE dispute_evidence ADD COLUMN milestone_index INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE dispute_evidence ALTER COLUMN milestone_index DROP DEFAULT;
    ALTER TABLE dispute_evidence ADD CONSTRAINT dispute_evidence_dispute_fkey
      FOREIGN KEY (escrow_id, milestone_index) REFERENCES disputes(escrow_id, milestone_index);

    ALTER TABLE votes ADD COLUMN milestone_index INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE votes ALTER COLUMN milestone_index DROP DEFAULT;
    ALTER TABLE votes ADD CONSTRAINT votes_escrow_milestone_juror_key
      UNIQUE (escrow_id, milestone_index, juror_wallet);
    ALTER TABLE votes ADD CONSTRAINT votes_dispute_fkey
      FOREIGN KEY (escrow_id, milestone_index) REFERENCES disputes(escrow_id, milestone_index);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE votes DROP CONSTRAINT votes_dispute_fkey;
    ALTER TABLE votes DROP CONSTRAINT votes_escrow_milestone_juror_key;
    ALTER TABLE votes DROP COLUMN milestone_index;
    ALTER TABLE votes ADD CONSTRAINT votes_escrow_id_juror_wallet_key UNIQUE (escrow_id, juror_wallet);

    ALTER TABLE dispute_evidence DROP CONSTRAINT dispute_evidence_dispute_fkey;
    ALTER TABLE dispute_evidence DROP COLUMN milestone_index;

    ALTER TABLE disputes DROP CONSTRAINT disputes_pkey;
    ALTER TABLE disputes ADD PRIMARY KEY (escrow_id);

    ALTER TABLE dispute_evidence ADD CONSTRAINT dispute_evidence_escrow_id_fkey
      FOREIGN KEY (escrow_id) REFERENCES disputes(escrow_id);
    ALTER TABLE votes ADD CONSTRAINT votes_escrow_id_fkey
      FOREIGN KEY (escrow_id) REFERENCES disputes(escrow_id);
  `);
};

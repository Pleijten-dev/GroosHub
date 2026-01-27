-- Migration: Add scoring_algorithm_version column to location_snapshots
-- This tracks which version of the scoring algorithm was used when saving a snapshot
-- Allows detection of scoring formula changes and potential re-scoring

-- Add scoring_algorithm_version column
ALTER TABLE location_snapshots
ADD COLUMN IF NOT EXISTS scoring_algorithm_version VARCHAR(20) DEFAULT '1.0.0';

-- Add index for version queries
CREATE INDEX IF NOT EXISTS idx_location_snapshots_scoring_version
ON location_snapshots(scoring_algorithm_version);

-- Add comment explaining the column
COMMENT ON COLUMN location_snapshots.scoring_algorithm_version IS
'Version of the scoring algorithm used when snapshot was created. Format: semver (e.g., 1.0.0).
Used to detect when scoring formulas change and data may need re-scoring.';

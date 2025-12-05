-- ================================================
-- Rollback 005: Drop File Uploads Table
-- Description: Rollback for migration 005
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS file_uploads_updated_at ON file_uploads;

-- Drop table
DROP TABLE IF EXISTS file_uploads CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') as table_dropped;

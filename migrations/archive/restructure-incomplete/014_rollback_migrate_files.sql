-- ================================================
-- Rollback 014: Revert File Migration
-- Description: Remove migrated files from file_uploads
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete migrated files
DELETE FROM file_uploads
WHERE metadata->>'migrated_from' = 'chat_files';

COMMIT;

-- Verification
SELECT
  'file_uploads' as table_name,
  COUNT(*) as migrated_count
FROM file_uploads
WHERE metadata->>'migrated_from' = 'chat_files';

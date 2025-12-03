-- ================================================
-- Migration 014: Migrate Chat Files to File Uploads
-- Description: Migrate chat_files to unified file_uploads table
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate 'chat_files' to 'file_uploads'
INSERT INTO file_uploads (
  id,
  user_id,
  project_id,
  chat_id,
  filename,
  original_filename,
  file_path,
  file_size_bytes,
  mime_type,
  file_category,
  storage_provider,
  storage_url,
  is_public,
  access_level,
  processing_status,
  metadata,
  created_at,
  updated_at
)
SELECT
  cf.id,
  -- Get user_id from the chat
  (SELECT user_id FROM chats WHERE id = cf.chat_id) as user_id,
  -- Get project_id from chat_conversations (will be NULL for private chats)
  (SELECT project_id FROM chat_conversations WHERE id = cf.chat_id) as project_id,
  cf.chat_id,
  cf.name as filename,
  cf.name as original_filename,
  cf.path as file_path,
  cf.size as file_size_bytes,
  cf.type as mime_type,
  -- Categorize based on mime_type
  CASE
    WHEN cf.type LIKE 'image/%' THEN 'image'
    WHEN cf.type LIKE 'application/pdf' THEN 'pdf'
    WHEN cf.type LIKE 'application/vnd.ms-excel%' OR cf.type LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' THEN 'spreadsheet'
    WHEN cf.type LIKE 'application/msword%' OR cf.type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml%' THEN 'document'
    WHEN cf.type LIKE 'text/%' THEN 'document'
    ELSE 'other'
  END as file_category,
  'local' as storage_provider,
  cf.path as storage_url,
  false as is_public,
  -- If chat has project_id, it's project-level, otherwise private
  CASE
    WHEN EXISTS (SELECT 1 FROM chat_conversations cc WHERE cc.id = cf.chat_id AND cc.project_id IS NOT NULL)
    THEN 'project'
    ELSE 'private'
  END as access_level,
  'completed' as processing_status,
  jsonb_build_object(
    'migrated_from', 'chat_files',
    'original_id', cf.id,
    'migration_date', CURRENT_TIMESTAMP
  ) as metadata,
  cf.created_at,
  cf.created_at as updated_at
FROM chat_files cf
WHERE NOT EXISTS (
  SELECT 1 FROM file_uploads fu WHERE fu.id = cf.id
);

-- Verification
SELECT
  'chat_files' as old_table,
  COUNT(*) as old_count
FROM chat_files
UNION ALL
SELECT
  'file_uploads' as new_table,
  COUNT(*) as new_count
FROM file_uploads
WHERE metadata->>'migrated_from' = 'chat_files';

COMMIT;

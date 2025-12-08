/**
 * Make file_url nullable in chat_files table
 *
 * The old schema had file_url as NOT NULL for S3/Supabase storage.
 * With R2 integration, we use storage_key instead of file_url.
 * This migration makes file_url nullable for backward compatibility.
 */

-- Make file_url nullable (it's deprecated in favor of storage_key)
ALTER TABLE chat_files ALTER COLUMN file_url DROP NOT NULL;

-- Make status nullable (optional field)
ALTER TABLE chat_files ALTER COLUMN status DROP NOT NULL;

-- Make error_message nullable (it already should be, but let's ensure it)
ALTER TABLE chat_files ALTER COLUMN error_message DROP NOT NULL;

COMMENT ON COLUMN chat_files.file_url IS 'DEPRECATED: Use storage_key instead. Kept for backwards compatibility.';
COMMENT ON COLUMN chat_files.storage_key IS 'R2 storage path (PRIMARY). Format: {env}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}';

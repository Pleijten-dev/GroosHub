-- ============================================
-- ARCHIVE AND NOTIFICATIONS MIGRATION
-- ============================================
-- Adds soft delete (archive) support and internal notifications system
-- Created: 2025-12-09
--
-- This migration:
-- 1. Adds archive fields to chat_conversations
-- 2. Creates notifications table for internal user notifications
-- 3. Adds indexes for performance
-- 4. Adds helper functions
-- ============================================

-- ============================================
-- 1. CHAT CONVERSATIONS ARCHIVE SUPPORT
-- ============================================
-- Add soft delete fields to chat_conversations
-- NOTE: project_projects already has deleted_at, deleted_by_user_id

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id INTEGER REFERENCES user_accounts(id) ON DELETE SET NULL;

-- Add index for archive queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_deleted_at ON chat_conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_deleted ON chat_conversations(user_id, deleted_at);

COMMENT ON COLUMN chat_conversations.deleted_at IS 'Soft delete timestamp (archive for 30 days)';
COMMENT ON COLUMN chat_conversations.deleted_by_user_id IS 'User who deleted this conversation';

-- ============================================
-- 2. INTERNAL NOTIFICATIONS TABLE
-- ============================================
-- Stores in-app notifications for users
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL,  -- 'project_invite', 'member_added', 'project_deleted', 'file_shared', 'archive_warning'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related entities (optional)
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE,

  -- Action data (optional)
  action_url TEXT,  -- Link to related resource
  action_label VARCHAR(100),  -- Button text (e.g., "View Project", "Accept Invite")

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'

  -- Expiration (auto-delete old notifications)
  expires_at TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Additional context

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires ON user_notifications(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE user_notifications IS 'Internal user notifications (no email)';
COMMENT ON COLUMN user_notifications.type IS 'Notification category for filtering and styling';
COMMENT ON COLUMN user_notifications.expires_at IS 'Auto-delete notification after this date';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_notifications_timestamp
BEFORE UPDATE ON user_notifications
FOR EACH ROW
EXECUTE FUNCTION update_user_notifications_timestamp();

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = CURRENT_TIMESTAMP
  WHERE id = p_notification_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_read IS 'Mark a notification as read';

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all unread notifications as read for a user';

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for a user';

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_notifications
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_notifications IS 'Delete expired notifications (call via cron)';

-- Function to get archived projects (deleted_at IS NOT NULL)
CREATE OR REPLACE FUNCTION get_archived_projects(p_user_id INTEGER)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER,
  days_until_permanent_delete INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.name,
    pp.deleted_at,
    pp.deleted_by_user_id,
    (30 - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pp.deleted_at))::INTEGER) as days_until_permanent_delete
  FROM project_projects pp
  JOIN project_members pm ON pm.project_id = pp.id
  WHERE pm.user_id = p_user_id
    AND pp.deleted_at IS NOT NULL
    AND pp.deleted_at > CURRENT_TIMESTAMP - INTERVAL '30 days'  -- Only show items within 30-day window
  ORDER BY pp.deleted_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_archived_projects IS 'Get archived projects for a user (30-day trash)';

-- Function to get archived chats (deleted_at IS NOT NULL)
CREATE OR REPLACE FUNCTION get_archived_chats(p_user_id INTEGER)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  project_id UUID,
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER,
  days_until_permanent_delete INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.title,
    cc.project_id,
    cc.deleted_at,
    cc.deleted_by_user_id,
    (30 - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cc.deleted_at))::INTEGER) as days_until_permanent_delete
  FROM chat_conversations cc
  WHERE cc.user_id = p_user_id
    AND cc.deleted_at IS NOT NULL
    AND cc.deleted_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  ORDER BY cc.deleted_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_archived_chats IS 'Get archived chats for a user (30-day trash)';

-- ============================================
-- 4. VIEWS FOR ANALYTICS
-- ============================================

-- View: Notification statistics per user
CREATE OR REPLACE VIEW user_notification_stats AS
SELECT
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_count,
  MAX(created_at) as latest_notification_at
FROM user_notifications
GROUP BY user_id;

COMMENT ON VIEW user_notification_stats IS 'Notification statistics per user';

-- ============================================
-- 5. SAMPLE QUERIES FOR REFERENCE
-- ============================================

-- Query 1: Get unread notifications for a user
-- SELECT *
-- FROM user_notifications
-- WHERE user_id = 1 AND is_read = false
-- ORDER BY created_at DESC;

-- Query 2: Get archived projects
-- SELECT * FROM get_archived_projects(1);

-- Query 3: Get archived chats
-- SELECT * FROM get_archived_chats(1);

-- Query 4: Restore a project from archive
-- UPDATE project_projects
-- SET deleted_at = NULL, deleted_by_user_id = NULL
-- WHERE id = 'project-uuid';

-- Query 5: Permanently delete a project (30 days passed)
-- DELETE FROM project_projects
-- WHERE id = 'project-uuid'
-- AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Query 6: Cleanup expired notifications (call via cron)
-- SELECT cleanup_expired_notifications();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Added archive support to chat_conversations (deleted_at, deleted_by_user_id)
-- ✅ Created user_notifications table for internal notifications
-- ✅ Added indexes for performance
-- ✅ Created helper functions:
--    - mark_notification_read()
--    - mark_all_notifications_read()
--    - get_unread_notification_count()
--    - cleanup_expired_notifications()
--    - get_archived_projects()
--    - get_archived_chats()
-- ✅ Created analytics view (user_notification_stats)
--
-- Next steps:
-- 1. Create API endpoints for notifications (/api/notifications)
-- 2. Create NotificationDropdown component in navbar
-- 3. Implement archive UI in sidebar (expandable sections)
-- 4. Create cron job for auto-cleanup (30-day expiration)
-- ============================================

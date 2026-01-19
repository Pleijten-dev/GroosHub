-- ============================================
-- COMPLETE TASK MANAGER MIGRATION
-- Run this entire script in PostgreSQL
-- ============================================

-- STEP 1: Check current state (optional - for diagnostics)
-- You can run these queries first to see what exists:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'task%';
-- \d tasks;

-- STEP 2: Clean up any existing task-related objects
-- This ensures a clean slate for the migration

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS task_assignment_summary CASCADE;
DROP VIEW IF EXISTS overdue_tasks CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_tasks(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_tasks_with_approaching_deadlines(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_project_task_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_task_deadline_notification(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_tasks_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_task_groups_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_task_notes_timestamp() CASCADE;

-- Drop tables (CASCADE will drop dependent objects like indexes and triggers)
DROP TABLE IF EXISTS task_notes CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_groups CASCADE;

-- STEP 3: Create all tables fresh

-- ============================================
-- 1. TASKS TABLE
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Task content
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Kanban status
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  position INTEGER NOT NULL DEFAULT 0,

  -- Task grouping (parent-child relationships)
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_group_id UUID,

  -- Scheduling
  deadline TIMESTAMP,
  start_date TIMESTAMP,
  estimated_hours NUMERIC(5, 2),
  actual_hours NUMERIC(5, 2),

  -- Priority and tags
  priority VARCHAR(20) DEFAULT 'normal',
  tags TEXT[],

  -- User tracking
  created_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  completed_by_user_id INTEGER REFERENCES user_accounts(id),
  completed_at TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Soft delete
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER REFERENCES user_accounts(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('todo', 'doing', 'done')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes for tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_created_by ON tasks(created_by_user_id);
CREATE INDEX idx_tasks_parent_task ON tasks(parent_task_id);
CREATE INDEX idx_tasks_task_group ON tasks(task_group_id);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_upcoming_deadlines ON tasks(deadline) WHERE deadline IS NOT NULL AND status != 'done';

COMMENT ON TABLE tasks IS 'Kanban-style task management system';
COMMENT ON COLUMN tasks.position IS 'Order within Kanban column (for drag-and-drop)';
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task for subtasks';
COMMENT ON COLUMN tasks.task_group_id IS 'Group ID for organizing related tasks';

-- ============================================
-- 2. TASK ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Assignment tracking
  assigned_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Assignment metadata
  role VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(task_id, user_id)
);

-- Indexes
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_task_user ON task_assignments(task_id, user_id);

COMMENT ON TABLE task_assignments IS 'Task-to-user assignments (many-to-many)';

-- ============================================
-- 3. TASK NOTES TABLE
-- ============================================
CREATE TABLE task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Note content
  content TEXT NOT NULL,

  -- Note metadata
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,

  -- Soft delete
  deleted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX idx_task_notes_user_id ON task_notes(user_id);
CREATE INDEX idx_task_notes_created ON task_notes(created_at DESC);

COMMENT ON TABLE task_notes IS 'Notes and comments on tasks';

-- ============================================
-- 4. TASK GROUPS TABLE
-- ============================================
CREATE TABLE task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Group info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- User tracking
  created_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Soft delete
  deleted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add FK constraint from tasks to task_groups
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_task_group
FOREIGN KEY (task_group_id) REFERENCES task_groups(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_task_groups_project_id ON task_groups(project_id);
CREATE INDEX idx_task_groups_position ON task_groups(position);

COMMENT ON TABLE task_groups IS 'Groups for organizing related tasks (Epics/Sprints)';

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger for tasks updated_at
CREATE OR REPLACE FUNCTION update_tasks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;

  -- Auto-set completed_at when status changes to 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;

  -- Clear completed_at when moving back from 'done'
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
    NEW.completed_by_user_id = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_tasks_timestamp();

-- Trigger for task_notes updated_at
CREATE OR REPLACE FUNCTION update_task_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.is_edited = true;
  NEW.edited_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_notes_timestamp
BEFORE UPDATE ON task_notes
FOR EACH ROW
EXECUTE FUNCTION update_task_notes_timestamp();

-- Trigger for task_groups updated_at
CREATE OR REPLACE FUNCTION update_task_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_groups_timestamp
BEFORE UPDATE ON task_groups
FOR EACH ROW
EXECUTE FUNCTION update_task_groups_timestamp();

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Get all tasks assigned to a user
CREATE OR REPLACE FUNCTION get_user_tasks(p_user_id INTEGER)
RETURNS TABLE (
  task_id UUID,
  task_title VARCHAR(500),
  task_description TEXT,
  task_status VARCHAR(20),
  task_priority VARCHAR(20),
  task_deadline TIMESTAMP,
  project_id UUID,
  project_name VARCHAR(255),
  assigned_at TIMESTAMP,
  days_until_deadline INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as task_id,
    t.title as task_title,
    t.description as task_description,
    t.status as task_status,
    t.priority as task_priority,
    t.deadline as task_deadline,
    pp.id as project_id,
    pp.name as project_name,
    ta.assigned_at,
    CASE
      WHEN t.deadline IS NOT NULL
      THEN EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER
      ELSE NULL
    END as days_until_deadline
  FROM tasks t
  JOIN task_assignments ta ON ta.task_id = t.id
  JOIN project_projects pp ON pp.id = t.project_id
  WHERE ta.user_id = p_user_id
    AND t.deleted_at IS NULL
    AND pp.deleted_at IS NULL
  ORDER BY
    CASE
      WHEN t.deadline IS NOT NULL THEN 0
      ELSE 1
    END,
    t.deadline ASC NULLS LAST,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_tasks IS 'Get all tasks assigned to a user across all projects';

-- Function: Get tasks with approaching deadlines
CREATE OR REPLACE FUNCTION get_tasks_with_approaching_deadlines(p_days_threshold INTEGER DEFAULT 3)
RETURNS TABLE (
  task_id UUID,
  task_title VARCHAR(500),
  project_id UUID,
  project_name VARCHAR(255),
  deadline TIMESTAMP,
  days_until_deadline INTEGER,
  assigned_user_ids INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as task_id,
    t.title as task_title,
    t.project_id,
    pp.name as project_name,
    t.deadline,
    EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER as days_until_deadline,
    ARRAY_AGG(ta.user_id) as assigned_user_ids
  FROM tasks t
  JOIN project_projects pp ON pp.id = t.project_id
  LEFT JOIN task_assignments ta ON ta.task_id = t.id
  WHERE t.deadline IS NOT NULL
    AND t.status != 'done'
    AND t.deleted_at IS NULL
    AND pp.deleted_at IS NULL
    AND t.deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + (p_days_threshold || ' days')::INTERVAL
  GROUP BY t.id, t.title, t.project_id, pp.name, t.deadline
  ORDER BY t.deadline ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tasks_with_approaching_deadlines IS 'Get tasks with deadlines approaching within N days';

-- Function: Get project task statistics
CREATE OR REPLACE FUNCTION get_project_task_stats(p_project_id UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  todo_tasks BIGINT,
  doing_tasks BIGINT,
  done_tasks BIGINT,
  overdue_tasks BIGINT,
  tasks_with_deadline BIGINT,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'todo') as todo_tasks,
    COUNT(*) FILTER (WHERE status = 'doing') as doing_tasks,
    COUNT(*) FILTER (WHERE status = 'done') as done_tasks,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < CURRENT_TIMESTAMP AND status != 'done') as overdue_tasks,
    COUNT(*) FILTER (WHERE deadline IS NOT NULL) as tasks_with_deadline,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'done')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
      2
    ) as completion_percentage
  FROM tasks
  WHERE project_id = p_project_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_task_stats IS 'Get task statistics for a project';

-- Function: Create task deadline notification
CREATE OR REPLACE FUNCTION create_task_deadline_notification(
  p_task_id UUID,
  p_user_id INTEGER,
  p_days_until_deadline INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_notification_id UUID;
  v_message TEXT;
  v_priority VARCHAR(20);
BEGIN
  -- Get task details
  SELECT t.title, t.deadline, pp.name as project_name, pp.id as project_id
  INTO v_task
  FROM tasks t
  JOIN project_projects pp ON pp.id = t.project_id
  WHERE t.id = p_task_id;

  -- Determine message and priority
  IF p_days_until_deadline <= 0 THEN
    v_message := 'Task "' || v_task.title || '" is overdue in project "' || v_task.project_name || '"';
    v_priority := 'urgent';
  ELSIF p_days_until_deadline = 1 THEN
    v_message := 'Task "' || v_task.title || '" is due tomorrow in project "' || v_task.project_name || '"';
    v_priority := 'high';
  ELSE
    v_message := 'Task "' || v_task.title || '" is due in ' || p_days_until_deadline || ' days in project "' || v_task.project_name || '"';
    v_priority := 'normal';
  END IF;

  -- Create notification (assuming user_notifications table exists)
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    project_id,
    action_url,
    action_label,
    priority,
    metadata
  )
  VALUES (
    p_user_id,
    'task_deadline',
    'Task Deadline Approaching',
    v_message,
    v_task.project_id,
    '/nl/ai-assistant?project=' || v_task.project_id,
    'View Task',
    v_priority,
    jsonb_build_object(
      'task_id', p_task_id,
      'task_title', v_task.title,
      'deadline', v_task.deadline,
      'days_until_deadline', p_days_until_deadline
    )
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
EXCEPTION
  WHEN undefined_table THEN
    -- If user_notifications doesn't exist, just return NULL
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_task_deadline_notification IS 'Create notification for approaching task deadline';

-- ============================================
-- 7. ANALYTICS VIEWS
-- ============================================

-- View: Task assignment summary
CREATE OR REPLACE VIEW task_assignment_summary AS
SELECT
  ta.user_id,
  ua.name as user_name,
  ua.email as user_email,
  COUNT(*) as total_assigned_tasks,
  COUNT(*) FILTER (WHERE t.status = 'todo') as todo_count,
  COUNT(*) FILTER (WHERE t.status = 'doing') as doing_count,
  COUNT(*) FILTER (WHERE t.status = 'done') as done_count,
  COUNT(*) FILTER (WHERE t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done') as overdue_count
FROM task_assignments ta
JOIN user_accounts ua ON ua.id = ta.user_id
JOIN tasks t ON t.id = ta.task_id
WHERE t.deleted_at IS NULL
GROUP BY ta.user_id, ua.name, ua.email;

COMMENT ON VIEW task_assignment_summary IS 'Task assignment statistics per user';

-- View: Overdue tasks
CREATE OR REPLACE VIEW overdue_tasks AS
SELECT
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.deadline,
  t.project_id,
  pp.name as project_name,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - t.deadline))::INTEGER as days_overdue,
  ARRAY_AGG(ua.name) as assigned_users
FROM tasks t
JOIN project_projects pp ON pp.id = t.project_id
LEFT JOIN task_assignments ta ON ta.task_id = t.id
LEFT JOIN user_accounts ua ON ua.id = ta.user_id
WHERE t.deadline IS NOT NULL
  AND t.deadline < CURRENT_TIMESTAMP
  AND t.status != 'done'
  AND t.deleted_at IS NULL
  AND pp.deleted_at IS NULL
GROUP BY t.id, t.title, t.description, t.status, t.priority, t.deadline, t.project_id, pp.name
ORDER BY t.deadline ASC;

COMMENT ON VIEW overdue_tasks IS 'All overdue tasks across all projects';

-- ============================================
-- 8. VERIFICATION
-- ============================================

-- Check that all tables were created
SELECT
  'tasks' as table_name,
  COUNT(*) as record_count
FROM tasks
UNION ALL
SELECT
  'task_assignments',
  COUNT(*)
FROM task_assignments
UNION ALL
SELECT
  'task_notes',
  COUNT(*)
FROM task_notes
UNION ALL
SELECT
  'task_groups',
  COUNT(*)
FROM task_groups;

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
-- Run this script with: psql -d your_database_name -f complete-task-migration.sql
-- Or copy-paste the entire content into your PostgreSQL client

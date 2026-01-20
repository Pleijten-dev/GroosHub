-- ============================================
-- TASK MANAGER (KANBAN) MIGRATION
-- ============================================
-- Adds comprehensive task management system with Kanban board functionality
-- Created: 2026-01-06
--
-- This migration:
-- 1. Creates tasks table with Kanban columns (todo, doing, done)
-- 2. Creates task_assignments for member assignments
-- 3. Creates task_notes for task comments/notes
-- 4. Creates task_groups for organizing related tasks
-- 5. Adds indexes for performance
-- 6. Adds helper functions for notifications and calendar views
-- ============================================

-- ============================================
-- 1. TASKS TABLE
-- ============================================
-- Main tasks table with Kanban functionality
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Task content
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Kanban status
  status VARCHAR(20) NOT NULL DEFAULT 'todo', -- 'todo', 'doing', 'done'
  position INTEGER NOT NULL DEFAULT 0, -- For ordering within column

  -- Task grouping (parent-child relationships)
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_group_id UUID, -- References task_groups table (created below)

  -- Scheduling
  deadline TIMESTAMP,
  start_date TIMESTAMP,
  estimated_hours NUMERIC(5, 2), -- Estimated time in hours
  actual_hours NUMERIC(5, 2), -- Actual time spent

  -- Priority and tags
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  tags TEXT[], -- Array of tags for filtering

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
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_group ON tasks(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_upcoming_deadlines ON tasks(deadline) WHERE deadline IS NOT NULL AND status != 'done';

COMMENT ON TABLE tasks IS 'Kanban-style task management system';
COMMENT ON COLUMN tasks.position IS 'Order within Kanban column (for drag-and-drop)';
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task for subtasks';
COMMENT ON COLUMN tasks.task_group_id IS 'Group ID for organizing related tasks';

-- ============================================
-- 2. TASK ASSIGNMENTS TABLE
-- ============================================
-- Many-to-many relationship between tasks and users
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Assignment tracking
  assigned_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Assignment metadata
  role VARCHAR(50), -- 'owner', 'assignee', 'reviewer', etc.
  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(task_id, user_id)
);

-- Indexes for task assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_user ON task_assignments(task_id, user_id);

COMMENT ON TABLE task_assignments IS 'Task-to-user assignments (many-to-many)';
COMMENT ON COLUMN task_assignments.role IS 'Assignment role (owner, assignee, reviewer)';

-- ============================================
-- 3. TASK NOTES TABLE
-- ============================================
-- Notes/comments on tasks
CREATE TABLE IF NOT EXISTS task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Note content
  content TEXT NOT NULL,

  -- Note metadata
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for task notes
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_user_id ON task_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_created ON task_notes(created_at DESC);

COMMENT ON TABLE task_notes IS 'Notes and comments on tasks';

-- Trigger for task notes updated_at
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

-- ============================================
-- 4. TASK GROUPS TABLE
-- ============================================
-- Groups for organizing related tasks
CREATE TABLE IF NOT EXISTS task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Group info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- User tracking
  created_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for task groups
CREATE INDEX IF NOT EXISTS idx_task_groups_project_id ON task_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_position ON task_groups(position);

COMMENT ON TABLE task_groups IS 'Groups for organizing related tasks';

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

-- Trigger for task groups updated_at
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

-- Function to get all tasks assigned to a user across all projects
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

-- Function to get tasks with approaching deadlines (for notifications)
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

COMMENT ON FUNCTION get_tasks_with_approaching_deadlines IS 'Get tasks with deadlines approaching within N days (default 3)';

-- Function to get task statistics for a project
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

-- Function to create deadline notification for task
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

  -- Determine message and priority based on days until deadline
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

  -- Create notification
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
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_task_deadline_notification IS 'Create a notification for an approaching task deadline';

-- ============================================
-- 7. VIEWS FOR ANALYTICS
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
-- 8. SAMPLE QUERIES FOR REFERENCE
-- ============================================

-- Query 1: Get all tasks for a project (Kanban board)
-- SELECT
--   t.*,
--   ARRAY_AGG(DISTINCT ua.name) FILTER (WHERE ua.name IS NOT NULL) as assigned_users,
--   COUNT(tn.id) as note_count
-- FROM tasks t
-- LEFT JOIN task_assignments ta ON ta.task_id = t.id
-- LEFT JOIN user_accounts ua ON ua.id = ta.user_id
-- LEFT JOIN task_notes tn ON tn.task_id = t.id
-- WHERE t.project_id = 'project-uuid'
--   AND t.deleted_at IS NULL
-- GROUP BY t.id
-- ORDER BY t.position ASC;

-- Query 2: Get tasks assigned to a specific user in a project
-- SELECT t.*
-- FROM tasks t
-- JOIN task_assignments ta ON ta.task_id = t.id
-- WHERE ta.user_id = 1
--   AND t.project_id = 'project-uuid'
--   AND t.deleted_at IS NULL
-- ORDER BY t.deadline ASC NULLS LAST;

-- Query 3: Get all tasks for a user across all projects (user calendar)
-- SELECT * FROM get_user_tasks(1);

-- Query 4: Get tasks with approaching deadlines
-- SELECT * FROM get_tasks_with_approaching_deadlines(3);

-- Query 5: Get task statistics for a project
-- SELECT * FROM get_project_task_stats('project-uuid');

-- Query 6: Move task to different status (drag-and-drop)
-- UPDATE tasks
-- SET status = 'doing', position = 2
-- WHERE id = 'task-uuid';

-- Query 7: Assign user to task
-- INSERT INTO task_assignments (task_id, user_id, assigned_by_user_id)
-- VALUES ('task-uuid', 1, 2);

-- Query 8: Add note to task
-- INSERT INTO task_notes (task_id, user_id, content)
-- VALUES ('task-uuid', 1, 'This is a note');

-- Query 9: Get task with all details
-- SELECT
--   t.*,
--   ARRAY_AGG(DISTINCT jsonb_build_object('id', ua.id, 'name', ua.name)) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
--   jsonb_agg(DISTINCT jsonb_build_object('id', tn.id, 'content', tn.content, 'user', tn_user.name, 'created_at', tn.created_at)) FILTER (WHERE tn.id IS NOT NULL) as notes,
--   tg.name as group_name
-- FROM tasks t
-- LEFT JOIN task_assignments ta ON ta.task_id = t.id
-- LEFT JOIN user_accounts ua ON ua.id = ta.user_id
-- LEFT JOIN task_notes tn ON tn.task_id = t.id
-- LEFT JOIN user_accounts tn_user ON tn_user.id = tn.user_id
-- LEFT JOIN task_groups tg ON tg.id = t.task_group_id
-- WHERE t.id = 'task-uuid'
-- GROUP BY t.id, tg.name;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Created tasks table with Kanban status (todo, doing, done)
-- ✅ Created task_assignments table (many-to-many tasks-users)
-- ✅ Created task_notes table for task comments
-- ✅ Created task_groups table for organizing tasks
-- ✅ Added indexes for performance
-- ✅ Created helper functions:
--    - get_user_tasks() - Get all tasks for a user
--    - get_tasks_with_approaching_deadlines() - For notifications
--    - get_project_task_stats() - Task statistics
--    - create_task_deadline_notification() - Create deadline notification
-- ✅ Created analytics views:
--    - task_assignment_summary
--    - overdue_tasks
-- ✅ Added triggers for timestamp updates
--
-- Next steps:
-- 1. Create API endpoints for task CRUD operations
-- 2. Create Kanban board UI component with drag-and-drop
-- 3. Create calendar views (project and user)
-- 4. Implement notification system for approaching deadlines
-- 5. Create task filtering and sorting UI
-- ============================================

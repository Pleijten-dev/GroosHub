-- ============================================
-- DIAGNOSTIC QUERIES - Run these first to check current state
-- ============================================

-- Check if tasks table exists and what columns it has
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check if project_projects table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'project_projects'
);

-- Check existing indexes on tasks table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tasks';

-- ============================================
-- FIX SCRIPT - Run this if tasks table has wrong schema
-- ============================================

-- Drop existing tasks-related tables if they exist (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS task_notes CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS task_groups CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS task_assignment_summary CASCADE;
DROP VIEW IF EXISTS overdue_tasks CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_user_tasks(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_tasks_with_approaching_deadlines(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_project_task_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_task_deadline_notification(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_tasks_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_task_groups_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_task_notes_timestamp() CASCADE;

-- Now you can run the full migration script again from the beginning

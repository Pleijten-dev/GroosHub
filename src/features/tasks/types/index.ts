/**
 * Task Management Type Definitions
 */

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TaskAssignedUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  assigned_at?: string;
}

export interface TaskNote {
  id: string;
  content: string;
  user_id: number;
  user_name: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  edited_at?: string;
}

export interface TaskGroup {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_by_user_id: number;
  created_by_name?: string;
  task_count?: number;
  completed_task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  priority: TaskPriority;
  deadline: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  parent_task_id: string | null;
  task_group_id: string | null;
  tags: string[];
  created_by_user_id: number;
  created_by_name?: string;
  completed_by_user_id: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields
  assigned_users?: TaskAssignedUser[];
  notes?: TaskNote[];
  note_count?: number;
  group_name?: string;
  group_color?: string;
  parent_task_title?: string;
  subtasks?: Task[];
  is_overdue?: boolean;
  days_until_deadline?: number | null;
  project_name?: string; // For cross-project views (user tasks page)
}

export interface TaskStats {
  total_tasks: number;
  todo_count: number;
  doing_count: number;
  done_count: number;
  overdue_count: number;
  tasks_with_deadline: number;
  urgent_count: number;
  high_count: number;
  normal_count: number;
  low_count: number;
  completion_percentage: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: string;
  start_date?: string;
  estimated_hours?: number;
  parent_task_id?: string;
  task_group_id?: string;
  tags?: string[];
  assigned_user_ids?: number[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  position?: number;
  priority?: TaskPriority;
  deadline?: string;
  start_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  parent_task_id?: string;
  task_group_id?: string;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus;
  assignedTo?: number;
  groupId?: string;
  sortBy?: 'created' | 'deadline' | 'priority' | 'position';
  sortOrder?: 'asc' | 'desc';
}

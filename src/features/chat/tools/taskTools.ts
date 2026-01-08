/**
 * AI Task Management Tools
 * These tools enable the AI assistant to help users manage tasks via natural language
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDbConnection } from '@/lib/db/connection';

/**
 * Create task management tools with user context
 * @param userId - Current authenticated user ID
 * @param locale - User's locale (nl/en)
 */
export function createTaskTools(userId: number, locale: string = 'en') {
  const db = getDbConnection();

  return {
    /**
     * List user's tasks across all projects with smart filtering
     */
    listUserTasks: tool({
      description: `Get the current user's tasks across all projects. Use this when user asks:
        - "What are my tasks?"
        - "Show me what I need to do"
        - "What's on my plate?"
        - "What tasks are overdue?"
        - "What's due soon?"

        Returns tasks with full details including project, priority, deadline, status, and assigned users.
        Can filter by status, priority, and time-based criteria.`,

      inputSchema: z.object({
        filter: z.enum(['all', 'overdue', 'today', 'this-week', 'no-deadline']).optional()
          .describe('Filter tasks by time: all, overdue, today, this-week, or no-deadline'),
        status: z.enum(['todo', 'doing', 'done']).optional()
          .describe('Filter by task status'),
        priority: z.enum(['urgent', 'high', 'normal', 'low']).optional()
          .describe('Filter by priority level'),
        limit: z.number().min(1).max(50).optional()
          .describe('Maximum number of tasks to return (default: 20)')
      }),

      async execute({ filter = 'all', status, priority, limit = 20 }: {
        filter?: 'all' | 'overdue' | 'today' | 'this-week' | 'no-deadline';
        status?: 'todo' | 'doing' | 'done';
        priority?: 'urgent' | 'high' | 'normal' | 'low';
        limit?: number;
      }) {
        try {
          let query = db`
            SELECT
              t.id,
              t.title,
              t.description,
              t.status,
              t.priority,
              t.deadline,
              t.created_at,
              pp.id as project_id,
              pp.name as project_name,
              tg.name as group_name,
              tg.color as group_color,
              CASE
                WHEN t.deadline < CURRENT_TIMESTAMP AND t.status != 'done' THEN true
                ELSE false
              END as is_overdue,
              EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER as days_until_deadline,
              ARRAY_AGG(DISTINCT jsonb_build_object(
                'id', ua.id,
                'name', ua.name
              )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
              COUNT(DISTINCT tn.id) as note_count
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            JOIN project_projects pp ON pp.id = t.project_id
            LEFT JOIN task_groups tg ON tg.id = t.task_group_id
            LEFT JOIN task_assignments ta2 ON ta2.task_id = t.id
            LEFT JOIN user_accounts ua ON ua.id = ta2.user_id
            LEFT JOIN task_notes tn ON tn.task_id = t.id
            WHERE ta.user_id = ${userId}
              AND t.deleted_at IS NULL
              AND pp.deleted_at IS NULL
              ${status ? db`AND t.status = ${status}` : db``}
              ${priority ? db`AND t.priority = ${priority}` : db``}
              ${filter === 'overdue' ? db`AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done'` : db``}
              ${filter === 'today' ? db`AND DATE(t.deadline) = CURRENT_DATE` : db``}
              ${filter === 'this-week' ? db`AND t.deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days'` : db``}
              ${filter === 'no-deadline' ? db`AND t.deadline IS NULL` : db``}
            GROUP BY t.id, pp.id, pp.name, tg.name, tg.color
            ORDER BY
              CASE WHEN t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
              t.deadline ASC NULLS LAST,
              CASE t.priority
                WHEN 'urgent' THEN 0
                WHEN 'high' THEN 1
                WHEN 'normal' THEN 2
                WHEN 'low' THEN 3
              END,
              t.created_at DESC
            LIMIT ${limit}
          `;

          const tasks = await query;

          return {
            success: true,
            count: tasks.length,
            filter: filter,
            tasks: tasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              deadline: t.deadline,
              is_overdue: t.is_overdue,
              days_until_deadline: t.days_until_deadline,
              project_name: t.project_name,
              project_id: t.project_id,
              group_name: t.group_name,
              assigned_users: t.assigned_users || [],
              note_count: parseInt(t.note_count) || 0,
              created_at: t.created_at
            }))
          };
        } catch (error) {
          console.error('Error listing user tasks:', error);
          return {
            success: false,
            error: 'Failed to retrieve tasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Create a new task from natural language
     */
    createTask: tool({
      description: `Create a new task. Use this when user says:
        - "Create a task to..."
        - "Add a task called..."
        - "I need to..."
        - "Remind me to..."

        Extract task details from natural language. If deadline is mentioned like "by Friday" or "next week", calculate the ISO date.
        Priority should be inferred from urgency words (ASAP, urgent, important = high/urgent).`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project (required - ask user which project if unclear)'),
        title: z.string().min(1).max(200)
          .describe('Clear, concise task title'),
        description: z.string().optional()
          .describe('Optional detailed description'),
        status: z.enum(['todo', 'doing', 'done']).default('todo')
          .describe('Initial status (default: todo)'),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
          .describe('Priority level based on urgency'),
        deadline: z.string().optional()
          .describe('ISO 8601 deadline date-time (calculate from phrases like "by Friday", "next week")'),
        assign_to_user_names: z.array(z.string()).optional()
          .describe('Names of users to assign (will look up by name)')
      }),

      async execute({ project_id, title, description, status, priority, deadline, assign_to_user_names }: {
        project_id: string;
        title: string;
        description?: string;
        status?: 'todo' | 'doing' | 'done';
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        deadline?: string;
        assign_to_user_names?: string[];
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT pp.id, pp.name
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return {
              success: false,
              error: 'Project not found or access denied'
            };
          }

          // Get next position in todo column
          const positionResult = await db`
            SELECT COALESCE(MAX(position), 0) + 1 as next_position
            FROM tasks
            WHERE project_id = ${project_id}
              AND status = ${status}
              AND deleted_at IS NULL
          `;
          const position = positionResult[0]?.next_position || 1;

          // Create task
          const newTask = await db`
            INSERT INTO tasks (
              project_id,
              title,
              description,
              status,
              position,
              priority,
              deadline,
              created_by_user_id
            )
            VALUES (
              ${project_id},
              ${title},
              ${description || null},
              ${status},
              ${position},
              ${priority},
              ${deadline || null},
              ${userId}
            )
            RETURNING *
          `;

          const task = newTask[0];

          // Assign to current user by default
          await db`
            INSERT INTO task_assignments (task_id, user_id, assigned_by_user_id)
            VALUES (${task.id}, ${userId}, ${userId})
          `;

          // Assign to additional users if specified
          if (assign_to_user_names && assign_to_user_names.length > 0) {
            const users = await db`
              SELECT id, name
              FROM user_accounts
              WHERE name = ANY(${assign_to_user_names})
                AND deleted_at IS NULL
            `;

            for (const user of users) {
              if (user.id !== userId) {
                await db`
                  INSERT INTO task_assignments (task_id, user_id, assigned_by_user_id)
                  VALUES (${task.id}, ${user.id}, ${userId})
                  ON CONFLICT DO NOTHING
                `;
              }
            }
          }

          return {
            success: true,
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline,
              project_name: projectAccess[0].name,
              project_id: project_id,
              url: `/${locale}/ai-assistant?project=${project_id}&tab=tasks&task=${task.id}`
            },
            message: `Created task "${title}" in ${projectAccess[0].name}`
          };
        } catch (error) {
          console.error('Error creating task:', error);
          return {
            success: false,
            error: 'Failed to create task',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Update an existing task
     */
    updateTask: tool({
      description: `Update a task's status, priority, deadline, or other fields. Use when user says:
        - "Move task X to doing"
        - "Mark task as done"
        - "Change priority to high"
        - "Set deadline to Friday"
        - "Assign task to John"`,

      inputSchema: z.object({
        task_id: z.string().uuid()
          .describe('UUID of the task to update'),
        status: z.enum(['todo', 'doing', 'done']).optional()
          .describe('New status'),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
          .describe('New priority'),
        deadline: z.string().nullable().optional()
          .describe('New deadline (ISO 8601) or null to remove'),
        assign_to_user_names: z.array(z.string()).optional()
          .describe('Add these users as assignees')
      }),

      async execute({ task_id, status, priority, deadline, assign_to_user_names }: {
        task_id: string;
        status?: 'todo' | 'doing' | 'done';
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        deadline?: string | null;
        assign_to_user_names?: string[];
      }) {
        try {
          // Verify task access
          const taskAccess = await db`
            SELECT t.id, t.title, pp.name as project_name
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            JOIN project_projects pp ON pp.id = t.project_id
            WHERE t.id = ${task_id}
              AND ta.user_id = ${userId}
              AND t.deleted_at IS NULL
            LIMIT 1
          `;

          if (taskAccess.length === 0) {
            return {
              success: false,
              error: 'Task not found or access denied'
            };
          }

          // Build update query
          const updates: any = {};
          if (status !== undefined) updates.status = status;
          if (priority !== undefined) updates.priority = priority;
          if (deadline !== undefined) updates.deadline = deadline;

          if (Object.keys(updates).length > 0) {
            await db`
              UPDATE tasks
              SET ${db(updates)},
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ${task_id}
            `;
          }

          // Handle user assignments
          if (assign_to_user_names && assign_to_user_names.length > 0) {
            const users = await db`
              SELECT id, name
              FROM user_accounts
              WHERE name = ANY(${assign_to_user_names})
                AND deleted_at IS NULL
            `;

            for (const user of users) {
              await db`
                INSERT INTO task_assignments (task_id, user_id, assigned_by_user_id)
                VALUES (${task_id}, ${user.id}, ${userId})
                ON CONFLICT DO NOTHING
              `;
            }
          }

          return {
            success: true,
            task_id,
            updates,
            message: `Updated task "${taskAccess[0].title}"`,
            url: `/${locale}/ai-assistant?tab=tasks&task=${task_id}`
          };
        } catch (error) {
          console.error('Error updating task:', error);
          return {
            success: false,
            error: 'Failed to update task',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Get project overview with task statistics
     */
    getProjectTaskSummary: tool({
      description: `Get an overview of tasks in a project with statistics. Use when user asks:
        - "How is project X going?"
        - "What's the status of project Y?"
        - "Show me project overview"
        - "What's blocking the sprint?"

        Returns task counts by status, overdue tasks, and team workload.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project'),
        include_details: z.boolean().default(false)
          .describe('Include list of overdue and upcoming tasks')
      }),

      async execute({ project_id, include_details }: {
        project_id: string;
        include_details?: boolean;
      }) {
        try {
          // Verify access
          const projectAccess = await db`
            SELECT pp.id, pp.name, pp.description
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return {
              success: false,
              error: 'Project not found or access denied'
            };
          }

          // Get statistics
          const stats = await db`
            SELECT
              COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
              COUNT(*) FILTER (WHERE status = 'doing') as doing_count,
              COUNT(*) FILTER (WHERE status = 'done') as done_count,
              COUNT(*) FILTER (WHERE deadline < CURRENT_TIMESTAMP AND status != 'done') as overdue_count,
              COUNT(*) FILTER (WHERE deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days') as due_this_week,
              COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
              COUNT(*) FILTER (WHERE priority = 'high') as high_count,
              COUNT(*) as total_count
            FROM tasks
            WHERE project_id = ${project_id}
              AND deleted_at IS NULL
          `;

          const result: any = {
            success: true,
            project: {
              id: project_id,
              name: projectAccess[0].name,
              description: projectAccess[0].description
            },
            statistics: {
              total: parseInt(stats[0].total_count),
              todo: parseInt(stats[0].todo_count),
              doing: parseInt(stats[0].doing_count),
              done: parseInt(stats[0].done_count),
              overdue: parseInt(stats[0].overdue_count),
              due_this_week: parseInt(stats[0].due_this_week),
              urgent: parseInt(stats[0].urgent_count),
              high_priority: parseInt(stats[0].high_count),
              completion_rate: stats[0].total_count > 0
                ? Math.round((stats[0].done_count / stats[0].total_count) * 100)
                : 0
            }
          };

          if (include_details && stats[0].overdue_count > 0) {
            const overdueTasks = await db`
              SELECT
                t.id,
                t.title,
                t.priority,
                t.deadline,
                ARRAY_AGG(DISTINCT ua.name) FILTER (WHERE ua.id IS NOT NULL) as assigned_to
              FROM tasks t
              LEFT JOIN task_assignments ta ON ta.task_id = t.id
              LEFT JOIN user_accounts ua ON ua.id = ta.user_id
              WHERE t.project_id = ${project_id}
                AND t.deadline < CURRENT_TIMESTAMP
                AND t.status != 'done'
                AND t.deleted_at IS NULL
              GROUP BY t.id
              ORDER BY t.deadline ASC
              LIMIT 10
            `;

            result.overdue_tasks = overdueTasks.map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              deadline: t.deadline,
              assigned_to: t.assigned_to || []
            }));
          }

          return result;
        } catch (error) {
          console.error('Error getting project summary:', error);
          return {
            success: false,
            error: 'Failed to get project summary',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Suggest task assignment based on workload
     */
    suggestTaskAssignment: tool({
      description: `Suggest who should be assigned to a task based on current workload. Use when user asks:
        - "Who should work on this?"
        - "Who has capacity?"
        - "Suggest someone for task X"`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('Project UUID'),
        task_title: z.string().optional()
          .describe('Task title for context')
      }),

      async execute({ project_id, task_title }: {
        project_id: string;
        task_title?: string;
      }) {
        try {
          // Get team members with task counts
          const teamLoad = await db`
            SELECT
              ua.id,
              ua.name,
              ua.email,
              COUNT(t.id) FILTER (WHERE t.status IN ('todo', 'doing')) as active_tasks,
              COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as completed_last_month
            FROM project_members pm
            JOIN user_accounts ua ON ua.id = pm.user_id
            LEFT JOIN task_assignments ta ON ta.user_id = ua.id
            LEFT JOIN tasks t ON t.id = ta.task_id AND t.deleted_at IS NULL
            WHERE pm.project_id = ${project_id}
              AND pm.deleted_at IS NULL
              AND ua.deleted_at IS NULL
            GROUP BY ua.id, ua.name, ua.email
            ORDER BY active_tasks ASC, completed_last_month DESC
            LIMIT 5
          `;

          if (teamLoad.length === 0) {
            return {
              success: false,
              error: 'No team members found in this project'
            };
          }

          return {
            success: true,
            suggestions: teamLoad.map((member, index) => ({
              user_id: member.id,
              name: member.name,
              email: member.email,
              active_tasks: parseInt(member.active_tasks),
              completed_last_month: parseInt(member.completed_last_month),
              recommendation_rank: index + 1,
              reason: index === 0
                ? 'Lightest current workload'
                : parseInt(member.completed_last_month) > 0
                  ? 'Good recent performance'
                  : 'Available capacity'
            })),
            message: `Suggested ${teamLoad[0].name} - currently has ${teamLoad[0].active_tasks} active tasks`
          };
        } catch (error) {
          console.error('Error suggesting assignment:', error);
          return {
            success: false,
            error: 'Failed to suggest assignment',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * List user's accessible projects
     */
    listUserProjects: tool({
      description: `Get list of projects the user has access to. Use when:
        - User wants to create a task but didn't specify project
        - User asks "what projects do I have?"
        - Need to clarify which project to use`,

      inputSchema: z.object({}),

      async execute() {
        try {
          const projects = await db`
            SELECT
              pp.id,
              pp.name,
              pp.description,
              pm.role,
              COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) as task_count
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            LEFT JOIN tasks t ON t.project_id = pp.id
            WHERE pm.user_id = ${userId}
              AND pp.deleted_at IS NULL
              AND pm.deleted_at IS NULL
            GROUP BY pp.id, pp.name, pp.description, pm.role
            ORDER BY pp.updated_at DESC
            LIMIT 20
          `;

          return {
            success: true,
            count: projects.length,
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              role: p.role,
              task_count: parseInt(p.task_count)
            }))
          };
        } catch (error) {
          console.error('Error listing projects:', error);
          return {
            success: false,
            error: 'Failed to list projects',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    })
  };
}

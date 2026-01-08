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
          .describe('Names of users to assign (will look up by name)'),
        parent_task_id: z.string().uuid().optional()
          .describe('UUID of parent task (this task depends on/is blocked by parent)'),
        parent_task_title: z.string().optional()
          .describe('Title of parent task to search for (alternative to parent_task_id)')
      }),

      async execute({ project_id, title, description, status, priority, deadline, assign_to_user_names, parent_task_id, parent_task_title }: {
        project_id: string;
        title: string;
        description?: string;
        status?: 'todo' | 'doing' | 'done';
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        deadline?: string;
        assign_to_user_names?: string[];
        parent_task_id?: string;
        parent_task_title?: string;
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

          // Resolve parent task if title provided instead of ID
          let resolvedParentId = parent_task_id;
          if (parent_task_title && !parent_task_id) {
            const parentTasks = await db`
              SELECT id, title FROM tasks
              WHERE project_id = ${project_id}
                AND title ILIKE ${'%' + parent_task_title + '%'}
                AND deleted_at IS NULL
              LIMIT 5
            `;

            if (parentTasks.length === 0) {
              return {
                success: false,
                error: `Parent task "${parent_task_title}" not found in this project.`
              };
            }

            if (parentTasks.length > 1) {
              return {
                success: false,
                error: `Multiple tasks match "${parent_task_title}". Please be more specific or use task ID.`,
                matches: parentTasks.map((t: any) => ({ id: t.id, title: t.title }))
              };
            }

            resolvedParentId = parentTasks[0].id;
          }

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
              parent_task_id,
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
              ${resolvedParentId || null},
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
    }),

    /**
     * Get Task Blockers - Find what's blocking a task from progressing
     */
    getTaskBlockers: tool({
      description: `Find what's blocking a task from progressing. Use when user asks:
        - "What's blocking task X?"
        - "Why can't I start this task?"
        - "Show me dependencies for task Y"
        - "What needs to finish before I can work on Z?"`,

      inputSchema: z.object({
        task_id: z.string().uuid()
          .describe('UUID of the task to check for blockers'),
        include_full_chain: z.boolean().default(true)
          .describe('Show entire dependency chain (all ancestors), not just immediate parent')
      }),

      async execute({ task_id, include_full_chain }: {
        task_id: string;
        include_full_chain?: boolean;
      }) {
        try {
          // Get task with immediate parent
          const taskResult = await db`
            SELECT
              t.id,
              t.title,
              t.status,
              t.priority,
              t.deadline,
              t.parent_task_id,
              parent.title as parent_task_title,
              parent.status as parent_task_status,
              parent.priority as parent_task_priority,
              parent.deadline as parent_task_deadline,
              pp.id as project_id,
              pp.name as project_name
            FROM tasks t
            LEFT JOIN tasks parent ON t.parent_task_id = parent.id AND parent.deleted_at IS NULL
            JOIN project_projects pp ON t.project_id = pp.id
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE t.id = ${task_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND t.deleted_at IS NULL
            LIMIT 1
          `;

          if (taskResult.length === 0) {
            return { success: false, error: 'Task not found or access denied' };
          }

          const task = taskResult[0];

          const result: any = {
            success: true,
            task: {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline
            },
            is_blocked: task.parent_task_id !== null && task.parent_task_status !== 'done',
            blocker: null,
            dependency_chain: []
          };

          // If task has a parent (is blocked by something)
          if (task.parent_task_id) {
            result.blocker = {
              id: task.parent_task_id,
              title: task.parent_task_title,
              status: task.parent_task_status,
              priority: task.parent_task_priority,
              deadline: task.parent_task_deadline,
              is_blocking: task.parent_task_status !== 'done'
            };

            // Get full dependency chain if requested
            if (include_full_chain) {
              const chain = await db`
                WITH RECURSIVE dependency_chain AS (
                  -- Start with immediate parent
                  SELECT
                    id,
                    title,
                    status,
                    priority,
                    deadline,
                    parent_task_id,
                    1 as level
                  FROM tasks
                  WHERE id = ${task.parent_task_id}
                    AND deleted_at IS NULL

                  UNION ALL

                  -- Recursively get ancestors
                  SELECT
                    t.id,
                    t.title,
                    t.status,
                    t.priority,
                    t.deadline,
                    t.parent_task_id,
                    dc.level + 1
                  FROM tasks t
                  JOIN dependency_chain dc ON t.id = dc.parent_task_id
                  WHERE t.deleted_at IS NULL
                    AND dc.level < 10  -- Prevent infinite loops
                )
                SELECT * FROM dependency_chain
                ORDER BY level ASC
              `;

              result.dependency_chain = chain.map((c: any) => ({
                id: c.id,
                title: c.title,
                status: c.status,
                priority: c.priority,
                deadline: c.deadline,
                level: c.level
              }));
            }

            // Provide recommendation
            if (task.parent_task_status === 'done') {
              result.recommendation = `Parent task "${task.parent_task_title}" is complete. You can proceed with this task.`;
            } else if (task.parent_task_status === 'doing') {
              result.recommendation = `Waiting on "${task.parent_task_title}" which is currently in progress. Consider checking with the assignee.`;
            } else {
              result.recommendation = `Blocked by "${task.parent_task_title}" (status: ${task.parent_task_status}). This must be completed first.`;
            }
          } else {
            result.recommendation = 'No blockers - this task can be started immediately.';
          }

          return result;
        } catch (error) {
          return {
            success: false,
            error: 'Failed to check task blockers',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Analyze Project Dependencies - Show all task dependencies and critical path
     */
    analyzeProjectDependencies: tool({
      description: `Analyze all task dependencies in a project. Identifies:
        - Blocked tasks (waiting on incomplete parents)
        - Critical path tasks (tasks that block others)
        - Orphaned tasks (no dependencies)

        Use when user asks:
        - "Show me project dependencies"
        - "What's the critical path?"
        - "Which tasks are blocked?"
        - "What's blocking the project?"`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project to analyze')
      }),

      async execute({ project_id }: { project_id: string }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT pp.id, pp.name
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return { success: false, error: 'Project not found or access denied' };
          }

          // Get all tasks with dependency information
          const tasks = await db`
            SELECT
              t.id,
              t.title,
              t.status,
              t.priority,
              t.deadline,
              t.parent_task_id,
              parent.title as parent_title,
              parent.status as parent_status,
              COUNT(DISTINCT children.id) FILTER (WHERE children.deleted_at IS NULL) as child_count
            FROM tasks t
            LEFT JOIN tasks parent ON t.parent_task_id = parent.id AND parent.deleted_at IS NULL
            LEFT JOIN tasks children ON children.parent_task_id = t.id AND children.deleted_at IS NULL
            WHERE t.project_id = ${project_id}
              AND t.deleted_at IS NULL
            GROUP BY t.id, parent.id, parent.title, parent.status
            ORDER BY t.created_at ASC
          `;

          // Categorize tasks
          const blockedTasks = tasks.filter((t: any) =>
            t.parent_task_id && t.parent_status !== 'done'
          );

          const criticalPathTasks = tasks.filter((t: any) =>
            parseInt(t.child_count) > 0 && t.status !== 'done'
          );

          const orphanedTasks = tasks.filter((t: any) =>
            !t.parent_task_id && parseInt(t.child_count) === 0
          );

          const completedWithDependencies = tasks.filter((t: any) =>
            t.parent_task_id && t.status === 'done'
          );

          return {
            success: true,
            project_name: projectAccess[0].name,
            summary: {
              total_tasks: tasks.length,
              tasks_with_dependencies: tasks.filter((t: any) => t.parent_task_id).length,
              blocked_count: blockedTasks.length,
              critical_path_count: criticalPathTasks.length,
              orphaned_count: orphanedTasks.length
            },
            blocked_tasks: {
              count: blockedTasks.length,
              tasks: blockedTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                waiting_on: t.parent_title,
                parent_status: t.parent_status
              }))
            },
            critical_path: {
              count: criticalPathTasks.length,
              description: 'Tasks that block other tasks from starting',
              tasks: criticalPathTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                deadline: t.deadline,
                blocking_count: parseInt(t.child_count)
              }))
            },
            orphaned_tasks: {
              count: orphanedTasks.length,
              description: 'Tasks with no dependencies (can work in parallel)',
              tasks: orphanedTasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority
              }))
            },
            recommendation: blockedTasks.length > 0
              ? `Focus on completing ${blockedTasks.length} blocker task${blockedTasks.length > 1 ? 's' : ''} to unblock downstream work.`
              : criticalPathTasks.length > 0
                ? `${criticalPathTasks.length} critical path task${criticalPathTasks.length > 1 ? 's' : ''} ${criticalPathTasks.length > 1 ? 'are' : 'is'} blocking others. Prioritize these.`
                : 'No blocked tasks - team can work in parallel on all tasks.'
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to analyze project dependencies',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Create Task With Subtasks - Create a parent task with automatic subtask breakdown
     */
    createTaskWithSubtasks: tool({
      description: `Create a parent task with subtasks. Use when user says:
        - "Create task X with subtasks for A, B, C"
        - "Break this down into smaller tasks"
        - "Create a project with tasks for..."

        This automatically creates a parent task and multiple child tasks.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project'),
        title: z.string().min(1).max(200)
          .describe('Parent task title'),
        description: z.string().optional()
          .describe('Parent task description'),
        status: z.enum(['todo', 'doing', 'done']).default('todo'),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        deadline: z.string().optional()
          .describe('Parent task deadline (ISO 8601)'),
        subtasks: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          estimated_hours: z.number().optional()
        }))
          .describe('List of subtasks to create')
      }),

      async execute({ project_id, title, description, status, priority, deadline, subtasks }: {
        project_id: string;
        title: string;
        description?: string;
        status?: 'todo' | 'doing' | 'done';
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        deadline?: string;
        subtasks: Array<{ title: string; description?: string; estimated_hours?: number }>;
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT pp.id, pp.name
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return { success: false, error: 'Project not found or access denied' };
          }

          // Get next position
          const positionResult = await db`
            SELECT COALESCE(MAX(position), 0) + 1 as next_position
            FROM tasks
            WHERE project_id = ${project_id}
              AND status = ${status}
              AND deleted_at IS NULL
          `;
          const position = positionResult[0]?.next_position || 1;

          // Create parent task
          const parentTask = await db`
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

          const parent = parentTask[0];

          // Create subtasks
          const createdSubtasks = [];
          for (let i = 0; i < subtasks.length; i++) {
            const subtask = subtasks[i];
            const subtaskPosition = i + 1;

            const created = await db`
              INSERT INTO tasks (
                project_id,
                title,
                description,
                parent_task_id,
                status,
                position,
                priority,
                estimated_hours,
                created_by_user_id
              )
              VALUES (
                ${project_id},
                ${subtask.title},
                ${subtask.description || null},
                ${parent.id},
                'todo',
                ${subtaskPosition},
                ${priority},
                ${subtask.estimated_hours || null},
                ${userId}
              )
              RETURNING *
            `;

            createdSubtasks.push(created[0]);
          }

          return {
            success: true,
            parent_task: {
              id: parent.id,
              title: parent.title,
              url: `/${locale}/ai-assistant?project=${project_id}&tab=tasks&task=${parent.id}`
            },
            subtasks: createdSubtasks.map(st => ({
              id: st.id,
              title: st.title,
              estimated_hours: st.estimated_hours
            })),
            message: `Created task "${title}" with ${createdSubtasks.length} subtask${createdSubtasks.length > 1 ? 's' : ''}.`,
            next_step: `View the task on the Kanban board to see all subtasks and track progress.`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to create task with subtasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Get Task With Subtasks - Show a task and all its subtasks
     */
    getTaskWithSubtasks: tool({
      description: `Get a task and all its subtasks with progress. Use when:
        - "Show me task X and its subtasks"
        - "What are the subtasks for Y?"
        - "How many subtasks are done?"`,

      inputSchema: z.object({
        task_id: z.string().uuid()
          .describe('UUID of the parent task')
      }),

      async execute({ task_id }: { task_id: string }) {
        try {
          // Get parent task
          const taskResult = await db`
            SELECT
              t.id,
              t.title,
              t.description,
              t.status,
              t.priority,
              t.deadline,
              t.created_at,
              pp.id as project_id,
              pp.name as project_name
            FROM tasks t
            JOIN project_projects pp ON t.project_id = pp.id
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE t.id = ${task_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND t.deleted_at IS NULL
            LIMIT 1
          `;

          if (taskResult.length === 0) {
            return { success: false, error: 'Task not found or access denied' };
          }

          const task = taskResult[0];

          // Get all subtasks
          const subtasks = await db`
            SELECT
              id,
              title,
              description,
              status,
              priority,
              deadline,
              estimated_hours,
              position,
              created_at
            FROM tasks
            WHERE parent_task_id = ${task_id}
              AND deleted_at IS NULL
            ORDER BY position ASC, created_at ASC
          `;

          // Calculate progress
          const totalSubtasks = subtasks.length;
          const completed = subtasks.filter((st: any) => st.status === 'done').length;
          const inProgress = subtasks.filter((st: any) => st.status === 'doing').length;
          const todo = subtasks.filter((st: any) => st.status === 'todo').length;
          const completionRate = totalSubtasks > 0 ? Math.round((completed / totalSubtasks) * 100) : 0;

          return {
            success: true,
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline,
              project_name: task.project_name
            },
            subtasks: subtasks.map((st: any) => ({
              id: st.id,
              title: st.title,
              description: st.description,
              status: st.status,
              priority: st.priority,
              deadline: st.deadline,
              estimated_hours: st.estimated_hours
            })),
            progress: {
              total: totalSubtasks,
              completed,
              in_progress: inProgress,
              todo,
              completion_percentage: completionRate
            },
            recommendation: completionRate === 100
              ? 'All subtasks complete! Consider marking the parent task as done.'
              : totalSubtasks === 0
                ? 'No subtasks yet. You can add subtasks to break down this task further.'
                : `${todo} subtask${todo !== 1 ? 's' : ''} remaining. ${completed}/${totalSubtasks} complete (${completionRate}%).`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get task with subtasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Search Tasks - Search for tasks using keywords or phrases
     */
    searchTasks: tool({
      description: `Search tasks using keywords or phrases. Use when user asks:
        - "Find tasks about X"
        - "Show tasks related to Y"
        - "Search for tasks mentioning Z"

        Searches across task titles, descriptions, and optionally notes.`,

      inputSchema: z.object({
        query: z.string()
          .describe('Search keywords or phrase (e.g., "authentication", "login bug", "database")'),
        project_id: z.string().uuid().optional()
          .describe('Limit search to specific project (optional - searches all projects if not provided)'),
        search_in: z.array(z.enum(['title', 'description', 'notes'])).default(['title', 'description'])
          .describe('Where to search: title, description, or notes'),
        status: z.enum(['todo', 'doing', 'done']).optional()
          .describe('Filter by status after searching'),
        include_completed: z.boolean().default(false)
          .describe('Include completed tasks in results'),
        limit: z.number().min(1).max(50).default(20)
      }),

      async execute({ query, project_id, search_in, status, include_completed, limit }: {
        query: string;
        project_id?: string;
        search_in?: Array<'title' | 'description' | 'notes'>;
        status?: 'todo' | 'doing' | 'done';
        include_completed?: boolean;
        limit?: number;
      }) {
        try {
          const searchPattern = `%${query}%`;

          // Build query based on search fields
          const results = await db`
            SELECT DISTINCT
              t.id,
              t.title,
              t.description,
              t.status,
              t.priority,
              t.deadline,
              pp.name as project_name,
              pp.id as project_id,

              -- Determine where match was found
              CASE
                WHEN t.title ILIKE ${searchPattern} THEN 'title'
                WHEN t.description ILIKE ${searchPattern} THEN 'description'
                ELSE 'unknown'
              END as match_location,

              -- Subtask count
              COUNT(DISTINCT children.id) FILTER (WHERE children.deleted_at IS NULL) as subtask_count

            FROM tasks t
            JOIN project_projects pp ON t.project_id = pp.id
            JOIN project_members pm ON pm.project_id = pp.id
            LEFT JOIN tasks children ON children.parent_task_id = t.id
            ${search_in?.includes('notes') ? 'LEFT JOIN task_notes tn ON tn.task_id = t.id AND tn.deleted_at IS NULL' : ''}

            WHERE pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND t.deleted_at IS NULL

              -- Search conditions
              AND (
                ${search_in?.includes('title') ? `t.title ILIKE ${searchPattern}` : 'FALSE'}
                ${search_in?.includes('description') ? `OR t.description ILIKE ${searchPattern}` : ''}
                ${search_in?.includes('notes') ? `OR tn.content ILIKE ${searchPattern}` : ''}
              )

              -- Optional filters
              ${project_id ? `AND t.project_id = ${project_id}` : ''}
              ${status ? `AND t.status = ${status}` : ''}
              ${!include_completed ? `AND t.status != 'done'` : ''}

            GROUP BY t.id, pp.id, pp.name

            ORDER BY
              -- Prioritize title matches
              CASE WHEN t.title ILIKE ${searchPattern} THEN 1 ELSE 2 END,
              t.created_at DESC

            LIMIT ${limit}
          `;

          if (results.length === 0) {
            return {
              success: true,
              count: 0,
              query,
              message: `No tasks found matching "${query}". Try different keywords or check spelling.`,
              tasks: []
            };
          }

          return {
            success: true,
            count: results.length,
            query,
            searched_in: search_in,
            tasks: results.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description?.substring(0, 200), // Truncate for brevity
              status: t.status,
              priority: t.priority,
              deadline: t.deadline,
              project_name: t.project_name,
              match_location: t.match_location,
              has_subtasks: parseInt(t.subtask_count) > 0,
              subtask_count: parseInt(t.subtask_count),
              url: `/${locale}/ai-assistant?project=${t.project_id}&tab=tasks&task=${t.id}`
            })),
            message: `Found ${results.length} task${results.length === 1 ? '' : 's'} matching "${query}".`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to search tasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Bulk Update Tasks - Update multiple tasks at once based on filters
     */
    bulkUpdateTasks: tool({
      description: `Update multiple tasks at once based on filters. Use when user asks:
        - "Mark all overdue tasks as high priority"
        - "Move all design tasks to doing"
        - "Set deadline for all todo tasks"
        - "Change all John's tasks to Sarah"

        IMPORTANT: Always confirm with user before bulk updates.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project'),
        filter: z.object({
          status: z.enum(['todo', 'doing', 'done']).optional(),
          priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
          overdue: z.boolean().optional(),
          title_contains: z.string().optional()
        }).optional()
          .describe('Filter which tasks to update'),
        updates: z.object({
          status: z.enum(['todo', 'doing', 'done']).optional(),
          priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
          deadline: z.string().nullable().optional()
        })
          .describe('What to update on matched tasks'),
        limit: z.number().min(1).max(50).default(20)
          .describe('Maximum number of tasks to update (safety limit)')
      }),

      async execute({ project_id, filter, updates, limit }: {
        project_id: string;
        filter?: {
          status?: 'todo' | 'doing' | 'done';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          overdue?: boolean;
          title_contains?: string;
        };
        updates: {
          status?: 'todo' | 'doing' | 'done';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          deadline?: string | null;
        };
        limit?: number;
      }) {
        try {
          // Verify project access
          const projectAccess = await db`
            SELECT pp.id, pp.name
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return { success: false, error: 'Project not found or access denied' };
          }

          // Build filter conditions
          const now = new Date();
          const conditions = [
            'project_id = ' + project_id,
            'deleted_at IS NULL'
          ];

          if (filter?.status) {
            conditions.push(`status = '${filter.status}'`);
          }
          if (filter?.priority) {
            conditions.push(`priority = '${filter.priority}'`);
          }
          if (filter?.overdue) {
            conditions.push(`deadline < '${now.toISOString()}' AND status != 'done'`);
          }
          if (filter?.title_contains) {
            conditions.push(`title ILIKE '%${filter.title_contains}%'`);
          }

          // First, preview what will be updated
          const tasksToUpdate = await db`
            SELECT id, title, status, priority, deadline
            FROM tasks
            WHERE ${db.unsafe(conditions.join(' AND '))}
            LIMIT ${limit}
          `;

          if (tasksToUpdate.length === 0) {
            return {
              success: true,
              updated_count: 0,
              message: 'No tasks match the specified filters.',
              tasks: []
            };
          }

          // Build update SET clause
          const updateFields = [];
          if (updates.status) {
            updateFields.push(`status = '${updates.status}'`);
          }
          if (updates.priority) {
            updateFields.push(`priority = '${updates.priority}'`);
          }
          if (updates.deadline !== undefined) {
            updateFields.push(updates.deadline === null
              ? 'deadline = NULL'
              : `deadline = '${updates.deadline}'`
            );
          }

          if (updateFields.length === 0) {
            return {
              success: false,
              error: 'No updates specified. Provide at least one field to update.'
            };
          }

          // Perform bulk update
          const taskIds = tasksToUpdate.map((t: any) => t.id);

          await db`
            UPDATE tasks
            SET ${db.unsafe(updateFields.join(', '))}
            WHERE id = ANY(${taskIds})
          `;

          return {
            success: true,
            updated_count: tasksToUpdate.length,
            message: `Successfully updated ${tasksToUpdate.length} task${tasksToUpdate.length > 1 ? 's' : ''}.`,
            tasks: tasksToUpdate.map((t: any) => ({
              id: t.id,
              title: t.title,
              old_status: t.status,
              new_status: updates.status || t.status,
              old_priority: t.priority,
              new_priority: updates.priority || t.priority
            })),
            recommendation: tasksToUpdate.length >= (limit || 20)
              ? `Reached limit of ${limit || 20} tasks. There may be more matching tasks. Consider refining filters.`
              : null
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to bulk update tasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Bulk Create Tasks - Create multiple tasks from a list
     */
    bulkCreateTasks: tool({
      description: `Create multiple tasks at once from a list. Use when user says:
        - "Create tasks for A, B, C"
        - "Add 5 tasks for next week's sprint"
        - "Create tasks from this list: ..."

        Efficiently creates multiple tasks in one operation.`,

      inputSchema: z.object({
        project_id: z.string().uuid()
          .describe('UUID of the project'),
        tasks: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
          deadline: z.string().optional(),
          status: z.enum(['todo', 'doing', 'done']).default('todo')
        }))
          .describe('List of tasks to create (max 20)'),
        default_priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
          .describe('Default priority for tasks without specified priority')
      }),

      async execute({ project_id, tasks, default_priority }: {
        project_id: string;
        tasks: Array<{
          title: string;
          description?: string;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          deadline?: string;
          status?: 'todo' | 'doing' | 'done';
        }>;
        default_priority?: 'low' | 'normal' | 'high' | 'urgent';
      }) {
        try {
          if (tasks.length === 0) {
            return { success: false, error: 'No tasks provided' };
          }

          if (tasks.length > 20) {
            return {
              success: false,
              error: `Too many tasks (${tasks.length}). Maximum is 20 per batch. Consider splitting into multiple operations.`
            };
          }

          // Verify project access
          const projectAccess = await db`
            SELECT pp.id, pp.name
            FROM project_projects pp
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE pp.id = ${project_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND pp.deleted_at IS NULL
            LIMIT 1
          `;

          if (projectAccess.length === 0) {
            return { success: false, error: 'Project not found or access denied' };
          }

          // Get starting position for todo column
          const positionResult = await db`
            SELECT COALESCE(MAX(position), 0) as max_position
            FROM tasks
            WHERE project_id = ${project_id}
              AND status = 'todo'
              AND deleted_at IS NULL
          `;
          let nextPosition = (positionResult[0]?.max_position || 0) + 1;

          // Create all tasks
          const createdTasks = [];
          for (const task of tasks) {
            const created = await db`
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
                ${task.title},
                ${task.description || null},
                ${task.status || 'todo'},
                ${nextPosition++},
                ${task.priority || default_priority},
                ${task.deadline || null},
                ${userId}
              )
              RETURNING id, title, status, priority
            `;

            createdTasks.push(created[0]);
          }

          return {
            success: true,
            created_count: createdTasks.length,
            message: `Successfully created ${createdTasks.length} task${createdTasks.length > 1 ? 's' : ''}.`,
            tasks: createdTasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              url: `/${locale}/ai-assistant?project=${project_id}&tab=tasks&task=${t.id}`
            })),
            next_step: `View all tasks on the Kanban board in project "${projectAccess[0].name}".`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to bulk create tasks',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Add Task Note - Add a comment/note to a task
     */
    addTaskNote: tool({
      description: `Add a comment or note to a task. Use when user says:
        - "Add a comment to task X"
        - "Note that..."
        - "Leave a comment on the design task"`,

      inputSchema: z.object({
        task_id: z.string().uuid()
          .describe('UUID of the task'),
        content: z.string().min(1)
          .describe('Note content/comment text')
      }),

      async execute({ task_id, content }: {
        task_id: string;
        content: string;
      }) {
        try {
          // Verify task access
          const taskAccess = await db`
            SELECT t.id, t.title, pp.name as project_name
            FROM tasks t
            JOIN project_projects pp ON t.project_id = pp.id
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE t.id = ${task_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND t.deleted_at IS NULL
            LIMIT 1
          `;

          if (taskAccess.length === 0) {
            return { success: false, error: 'Task not found or access denied' };
          }

          // Create note
          const note = await db`
            INSERT INTO task_notes (
              task_id,
              user_id,
              content
            )
            VALUES (
              ${task_id},
              ${userId},
              ${content}
            )
            RETURNING id, content, created_at
          `;

          return {
            success: true,
            note: {
              id: note[0].id,
              content: note[0].content,
              created_at: note[0].created_at
            },
            task: {
              id: taskAccess[0].id,
              title: taskAccess[0].title,
              project_name: taskAccess[0].project_name
            },
            message: `Note added to task "${taskAccess[0].title}".`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to add note',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }),

    /**
     * Get Task Notes - Get all comments/notes for a task
     */
    getTaskNotes: tool({
      description: `Get all comments and notes for a task. Use when user asks:
        - "Show me notes on task X"
        - "What comments are on the design task?"
        - "Summarize discussion on task Y"`,

      inputSchema: z.object({
        task_id: z.string().uuid()
          .describe('UUID of the task')
      }),

      async execute({ task_id }: { task_id: string }) {
        try {
          // Verify task access and get task info
          const taskAccess = await db`
            SELECT t.id, t.title, pp.name as project_name
            FROM tasks t
            JOIN project_projects pp ON t.project_id = pp.id
            JOIN project_members pm ON pm.project_id = pp.id
            WHERE t.id = ${task_id}
              AND pm.user_id = ${userId}
              AND pm.left_at IS NULL
              AND t.deleted_at IS NULL
            LIMIT 1
          `;

          if (taskAccess.length === 0) {
            return { success: false, error: 'Task not found or access denied' };
          }

          // Get all notes
          const notes = await db`
            SELECT
              tn.id,
              tn.content,
              tn.created_at,
              ua.name as author_name,
              ua.id as author_id
            FROM task_notes tn
            JOIN user_accounts ua ON tn.user_id = ua.id
            WHERE tn.task_id = ${task_id}
              AND tn.deleted_at IS NULL
            ORDER BY tn.created_at ASC
          `;

          return {
            success: true,
            task: {
              id: taskAccess[0].id,
              title: taskAccess[0].title,
              project_name: taskAccess[0].project_name
            },
            notes_count: notes.length,
            notes: notes.map((n: any) => ({
              id: n.id,
              content: n.content,
              author: n.author_name,
              created_at: n.created_at,
              is_mine: n.author_id === userId
            })),
            summary: notes.length === 0
              ? 'No notes yet on this task.'
              : `${notes.length} note${notes.length > 1 ? 's' : ''} on this task.`
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get task notes',
            details: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    })
  };
}

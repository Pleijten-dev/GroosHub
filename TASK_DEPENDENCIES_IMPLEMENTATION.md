# Task Dependencies - Implementation Plan

## Critical Gap Identified
The database has `parent_task_id` but NO AI support for dependencies/blockers.

## New Tools to Add

### 1. getTaskBlockers
```typescript
getTaskBlockers: tool({
  description: `Find what's blocking a task from progressing. Use when:
    - "What's blocking the design?"
    - "Why can't we start development?"
    - "Show dependencies for task X"`,

  inputSchema: z.object({
    task_id: z.string().uuid()
      .describe('Task UUID or use findTaskByTitle first'),
    include_upstream: z.boolean().default(true)
      .describe('Show entire dependency chain, not just immediate parent')
  }),

  async execute({ task_id, include_upstream }) {
    // Get immediate parent
    const task = await db`
      SELECT
        t.id,
        t.title,
        t.status,
        t.parent_task_id,
        parent.title as parent_title,
        parent.status as parent_status,
        parent.deadline as parent_deadline
      FROM tasks t
      LEFT JOIN tasks parent ON t.parent_task_id = parent.id
      WHERE t.id = ${task_id}
        AND t.deleted_at IS NULL
    `;

    if (task.length === 0) {
      return { success: false, error: 'Task not found' };
    }

    const result = {
      success: true,
      task_title: task[0].title,
      status: task[0].status,
      blocker: null as any,
      dependency_chain: [] as any[]
    };

    // If has parent (blocker)
    if (task[0].parent_task_id) {
      result.blocker = {
        id: task[0].parent_task_id,
        title: task[0].parent_title,
        status: task[0].parent_status,
        deadline: task[0].parent_deadline,
        is_blocking: task[0].parent_status !== 'done',
        recommendation: task[0].parent_status === 'done'
          ? 'Blocker is complete, you can proceed'
          : `Waiting on "${task[0].parent_title}" to be completed`
      };

      // Get full dependency chain if requested
      if (include_upstream) {
        // Recursive CTE to get all ancestors
        const chain = await db`
          WITH RECURSIVE dependency_chain AS (
            SELECT id, title, status, parent_task_id, 1 as level
            FROM tasks
            WHERE id = ${task[0].parent_task_id}

            UNION ALL

            SELECT t.id, t.title, t.status, t.parent_task_id, dc.level + 1
            FROM tasks t
            JOIN dependency_chain dc ON t.id = dc.parent_task_id
            WHERE t.deleted_at IS NULL AND dc.level < 10
          )
          SELECT * FROM dependency_chain ORDER BY level;
        `;

        result.dependency_chain = chain;
      }
    }

    return result;
  }
})
```

### 2. createTaskWithDependency
```typescript
// Enhance existing createTask tool with:
inputSchema: z.object({
  // ... existing fields
  parent_task_id: z.string().uuid().optional()
    .describe('UUID of parent task (this task cannot start until parent is done)'),
  parent_task_title: z.string().optional()
    .describe('Title of parent task (will look up ID automatically)')
})

// In execute function, add:
let resolvedParentId = parent_task_id;

if (parent_task_title && !parent_task_id) {
  // Look up parent task by title
  const parentTasks = await db`
    SELECT id FROM tasks
    WHERE title ILIKE ${`%${parent_task_title}%`}
      AND project_id = ${project_id}
      AND deleted_at IS NULL
    LIMIT 5
  `;

  if (parentTasks.length === 0) {
    return {
      success: false,
      error: `Parent task "${parent_task_title}" not found in this project`
    };
  }

  if (parentTasks.length > 1) {
    return {
      success: false,
      error: `Multiple tasks match "${parent_task_title}". Be more specific or use task ID.`,
      matches: parentTasks.map(t => ({ id: t.id, title: t.title }))
    };
  }

  resolvedParentId = parentTasks[0].id;
}

// Then in INSERT:
const [task] = await db`
  INSERT INTO tasks (
    project_id,
    title,
    description,
    status,
    priority,
    deadline,
    parent_task_id,  -- ADD THIS
    created_by
  )
  VALUES (
    ${project_id},
    ${title},
    ${description},
    ${status},
    ${priority},
    ${deadline ? new Date(deadline) : null},
    ${resolvedParentId || null},  -- ADD THIS
    ${userId}
  )
  RETURNING *
`;
```

### 3. analyzeProjectDependencies
```typescript
analyzeProjectDependencies: tool({
  description: `Show all task dependencies in a project. Identify:
    - Critical path tasks (longest chain)
    - Blocked tasks (waiting on incomplete parents)
    - Orphaned tasks (no dependencies)`,

  inputSchema: z.object({
    project_id: z.string().uuid()
  }),

  async execute({ project_id }) {
    // Get all tasks with parent relationships
    const tasks = await db`
      SELECT
        t.id,
        t.title,
        t.status,
        t.deadline,
        t.parent_task_id,
        parent.title as parent_title,
        parent.status as parent_status,
        COUNT(children.id) as child_count
      FROM tasks t
      LEFT JOIN tasks parent ON t.parent_task_id = parent.id
      LEFT JOIN tasks children ON children.parent_task_id = t.id
        AND children.deleted_at IS NULL
      WHERE t.project_id = ${project_id}
        AND t.deleted_at IS NULL
      GROUP BY t.id, parent.id
    `;

    const blockedTasks = tasks.filter(t =>
      t.parent_task_id && t.parent_status !== 'done'
    );

    const criticalPath = tasks.filter(t =>
      t.child_count > 0 && t.status !== 'done'
    );

    const orphanedTasks = tasks.filter(t =>
      !t.parent_task_id && t.child_count === 0
    );

    return {
      success: true,
      total_tasks: tasks.length,
      tasks_with_dependencies: tasks.filter(t => t.parent_task_id).length,
      blocked_tasks: {
        count: blockedTasks.length,
        tasks: blockedTasks.map(t => ({
          id: t.id,
          title: t.title,
          waiting_on: t.parent_title,
          status: t.status
        }))
      },
      critical_path: {
        count: criticalPath.length,
        tasks: criticalPath.map(t => ({
          id: t.id,
          title: t.title,
          blocking_count: t.child_count,
          deadline: t.deadline
        }))
      },
      orphaned_tasks: {
        count: orphanedTasks.length,
        tasks: orphanedTasks.map(t => ({ id: t.id, title: t.title }))
      },
      recommendation: blockedTasks.length > 0
        ? `Focus on completing ${blockedTasks.length} blocker tasks to unblock downstream work`
        : 'No blocked tasks - team can work in parallel'
    };
  }
})
```

## Integration Steps

1. Add these 3 tools to `/src/features/chat/tools/taskTools.ts`
2. Update task agent prompts to document dependency features:
   ```
   "You can create tasks with dependencies:
   - 'Create a task for deployment that depends on the testing task'
   - 'What's blocking the launch?'
   - 'Show me the project dependency chain'"
   ```
3. Test with conversations:
   - "Create a task for code review that blocks the deployment task"
   - "What's blocking the website launch?"
   - "Show me all blocked tasks in Project X"

## Edge Cases to Handle

1. **Circular dependencies**: Prevent task A → B → C → A
2. **Deep nesting**: Limit dependency chains to 10 levels
3. **Cross-project dependencies**: Currently not supported (future)
4. **Orphaned tasks after parent deletion**: Set parent_task_id to NULL

## Database Already Supports This

The `tasks` table has:
```sql
parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL
```

We just need to expose it through AI tools!

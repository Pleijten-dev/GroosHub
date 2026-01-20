# Subtasks & Text Search - Implementation Plan

## 2. Subtask Support (CRITICAL)

### Problem
Database supports `parent_task_id` but AI can't break down tasks into subtasks.

### Example User Query That Currently Fails
```
User: "Create a task for website redesign with subtasks for wireframes, mockups, and implementation"

Current behavior: Creates 1 task with long description
Expected: Creates 1 parent + 3 subtasks automatically
```

### Solution: Add Subtask Creation

```typescript
createTaskWithSubtasks: tool({
  description: `Create a parent task with automatic subtask breakdown. Use when user says:
    - "Create task X with subtasks for A, B, C"
    - "Break this down into smaller tasks"
    - "Create a project with tasks for..."`,

  inputSchema: z.object({
    project_id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['todo', 'doing', 'done']).default('todo'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    deadline: z.string().optional(),

    // Subtask options
    subtasks: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      estimated_hours: z.number().optional()
    })).optional()
      .describe('List of subtasks to create under this parent task'),

    auto_breakdown: z.boolean().default(false)
      .describe('Let AI suggest subtasks based on parent task description')
  }),

  async execute({ project_id, title, description, subtasks, auto_breakdown, ...rest }) {
    // 1. Create parent task
    const [parentTask] = await db`
      INSERT INTO tasks (
        project_id, title, description, status, priority, deadline, created_by
      )
      VALUES (
        ${project_id}, ${title}, ${description}, ${rest.status}, ${rest.priority},
        ${rest.deadline ? new Date(rest.deadline) : null}, ${userId}
      )
      RETURNING *
    `;

    const createdSubtasks = [];

    // 2. Create subtasks if provided
    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        const [created] = await db`
          INSERT INTO tasks (
            project_id,
            title,
            description,
            parent_task_id,  -- Link to parent
            status,
            priority,
            estimated_hours,
            created_by
          )
          VALUES (
            ${project_id},
            ${subtask.title},
            ${subtask.description || null},
            ${parentTask.id},
            'todo',
            ${rest.priority},
            ${subtask.estimated_hours || null},
            ${userId}
          )
          RETURNING *
        `;
        createdSubtasks.push(created);
      }
    }

    // 3. Auto-suggest subtasks if requested (future enhancement)
    // This would use AI to parse the description and suggest breakdown
    // For now, just return what we created

    return {
      success: true,
      parent_task: {
        id: parentTask.id,
        title: parentTask.title,
        url: `/${locale}/ai-assistant?project=${project_id}&tab=tasks&task=${parentTask.id}`
      },
      subtasks: createdSubtasks.map(st => ({
        id: st.id,
        title: st.title
      })),
      message: subtasks && subtasks.length > 0
        ? `Created task "${title}" with ${createdSubtasks.length} subtasks`
        : `Created task "${title}". You can add subtasks later.`
    };
  }
})
```

### Enhance listUserTasks to Show Subtask Status

```typescript
// In listUserTasks, modify the query to include subtask counts:

const query = db`
  SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.deadline,
    t.parent_task_id,
    parent.title as parent_task_title,

    -- Subtask counts
    COUNT(DISTINCT children.id) FILTER (WHERE children.deleted_at IS NULL) as total_subtasks,
    COUNT(DISTINCT children.id) FILTER (
      WHERE children.deleted_at IS NULL AND children.status = 'done'
    ) as completed_subtasks,

    -- Calculate completion percentage
    CASE
      WHEN COUNT(DISTINCT children.id) FILTER (WHERE children.deleted_at IS NULL) > 0
      THEN ROUND(
        100.0 * COUNT(DISTINCT children.id) FILTER (
          WHERE children.deleted_at IS NULL AND children.status = 'done'
        ) / COUNT(DISTINCT children.id) FILTER (WHERE children.deleted_at IS NULL)
      )
      ELSE NULL
    END as subtask_completion_percentage

  FROM tasks t
  LEFT JOIN tasks parent ON t.parent_task_id = parent.id
  LEFT JOIN tasks children ON children.parent_task_id = t.id
  -- ... rest of query
  GROUP BY t.id, parent.id
`;

// Return format:
return {
  success: true,
  tasks: results.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    has_subtasks: t.total_subtasks > 0,
    subtask_progress: t.total_subtasks > 0
      ? `${t.completed_subtasks}/${t.total_subtasks} complete (${t.subtask_completion_percentage}%)`
      : null,
    parent_task: t.parent_task_id ? {
      id: t.parent_task_id,
      title: t.parent_task_title
    } : null
  }))
};
```

### New Tool: getTaskWithSubtasks

```typescript
getTaskWithSubtasks: tool({
  description: `Get a task and all its subtasks. Use when:
    - "Show me the website redesign task and its subtasks"
    - "What are the subtasks for the launch?"`,

  inputSchema: z.object({
    task_id: z.string().uuid()
  }),

  async execute({ task_id }) {
    const [task] = await db`
      SELECT * FROM tasks
      WHERE id = ${task_id} AND deleted_at IS NULL
    `;

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const subtasks = await db`
      SELECT
        id,
        title,
        description,
        status,
        priority,
        deadline,
        estimated_hours,
        created_at
      FROM tasks
      WHERE parent_task_id = ${task_id}
        AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;

    const completionRate = subtasks.length > 0
      ? (subtasks.filter(st => st.status === 'done').length / subtasks.length) * 100
      : 0;

    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        deadline: task.deadline
      },
      subtasks: subtasks.map(st => ({
        id: st.id,
        title: st.title,
        status: st.status,
        priority: st.priority,
        deadline: st.deadline,
        estimated_hours: st.estimated_hours
      })),
      summary: {
        total_subtasks: subtasks.length,
        completed: subtasks.filter(st => st.status === 'done').length,
        in_progress: subtasks.filter(st => st.status === 'doing').length,
        todo: subtasks.filter(st => st.status === 'todo').length,
        completion_rate: Math.round(completionRate)
      },
      recommendation: completionRate === 100
        ? 'All subtasks complete - consider marking parent task as done'
        : `${subtasks.filter(st => st.status === 'todo').length} subtasks remaining`
    };
  }
})
```

---

## 3. Text Search (HIGH PRIORITY)

### Problem
Current `listUserTasks` only supports predefined filters (overdue, today, this-week).
Can't search by keywords or text.

### Example Queries That Fail
```
- "Show me tasks about authentication"
- "Find tasks mentioning database migration"
- "What tasks reference the login feature?"
```

### Solution: Add searchTasks Tool

```typescript
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
      .describe('Limit search to specific project'),

    search_in: z.array(z.enum(['title', 'description', 'notes']))
      .default(['title', 'description'])
      .describe('Where to search (title, description, or notes)'),

    status: z.enum(['todo', 'doing', 'done']).optional()
      .describe('Filter by status after searching'),

    include_completed: z.boolean().default(false)
      .describe('Include completed tasks in results'),

    limit: z.number().min(1).max(50).default(20)
  }),

  async execute({ query, project_id, search_in, status, include_completed, limit }) {
    // Build search query based on what fields to search
    const searchConditions = [];

    if (search_in.includes('title')) {
      searchConditions.push(`t.title ILIKE ${'%' + query + '%'}`);
    }

    if (search_in.includes('description')) {
      searchConditions.push(`t.description ILIKE ${'%' + query + '%'}`);
    }

    // For searching in notes, we need to join the task_notes table
    const notesJoin = search_in.includes('notes')
      ? 'LEFT JOIN task_notes tn ON tn.task_id = t.id AND tn.deleted_at IS NULL'
      : '';

    if (search_in.includes('notes')) {
      searchConditions.push(`tn.content ILIKE ${'%' + query + '%'}`);
    }

    // Execute search
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

        -- Highlight where match was found
        CASE
          WHEN t.title ILIKE ${'%' + query + '%'} THEN 'title'
          WHEN t.description ILIKE ${'%' + query + '%'} THEN 'description'
          ${search_in.includes('notes') ? `WHEN tn.content ILIKE ${'%' + query + '%'} THEN 'notes'` : ''}
          ELSE 'unknown'
        END as match_location,

        -- Count total matches
        COUNT(*) OVER() as total_matches

      FROM tasks t
      JOIN project_projects pp ON t.project_id = pp.id
      JOIN project_members pm ON pm.project_id = pp.id
      ${notesJoin}

      WHERE pm.user_id = ${userId}
        AND pm.left_at IS NULL
        AND t.deleted_at IS NULL

        -- Search conditions
        AND (${searchConditions.join(' OR ')})

        -- Optional filters
        ${project_id ? `AND t.project_id = ${project_id}` : ''}
        ${status ? `AND t.status = ${status}` : ''}
        ${!include_completed ? `AND t.status != 'done'` : ''}

      ORDER BY
        -- Prioritize title matches, then description, then notes
        CASE
          WHEN t.title ILIKE ${'%' + query + '%'} THEN 1
          WHEN t.description ILIKE ${'%' + query + '%'} THEN 2
          ELSE 3
        END,
        t.created_at DESC

      LIMIT ${limit}
    `;

    if (results.length === 0) {
      return {
        success: true,
        count: 0,
        query: query,
        message: `No tasks found matching "${query}". Try different keywords or check spelling.`,
        tasks: []
      };
    }

    return {
      success: true,
      count: results.length,
      total_matches: results[0]?.total_matches || 0,
      query: query,
      searched_in: search_in,
      tasks: results.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description?.substring(0, 200), // Truncate for brevity
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        project_name: t.project_name,
        match_location: t.match_location, // Where the search term was found
        url: `/${locale}/ai-assistant?project=${t.project_id}&tab=tasks&task=${t.id}`
      })),
      message: results.length < results[0]?.total_matches
        ? `Showing ${results.length} of ${results[0].total_matches} matches. Use filters to narrow results.`
        : `Found ${results.length} ${results.length === 1 ? 'task' : 'tasks'} matching "${query}"`
    };
  }
})
```

### Future Enhancement: Full-Text Search

For better performance with large datasets, upgrade to PostgreSQL full-text search:

```typescript
// Create index (run as migration):
CREATE INDEX tasks_fts_idx ON tasks USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

// Then use in query:
WHERE to_tsvector('english', t.title || ' ' || coalesce(t.description, ''))
  @@ plainto_tsquery('english', ${query})
```

### Even More Advanced: Semantic Search with Embeddings

For true "smart search" (understanding meaning, not just keywords):

1. Generate embeddings for task titles/descriptions using OpenAI embeddings
2. Store in `pgvector` extension
3. Query using cosine similarity

This would enable:
- "Find tasks similar to this bug I'm describing"
- Understanding synonyms (search "auth" finds "authentication" tasks)
- Conceptual similarity (search "performance" finds "optimization" tasks)

---

## Priority Order for Implementation

### This Week (Critical):
1. **Task Dependencies** - 3 tools (getTaskBlockers, createTaskWithDependency, analyzeProjectDependencies)
2. **Subtasks** - 2 tools (createTaskWithSubtasks, getTaskWithSubtasks) + enhance listUserTasks
3. **Text Search** - 1 tool (searchTasks with ILIKE)

### Next Week (High Value):
4. **Bulk Operations** - bulkUpdateTasks, bulkCreateTasks
5. **Task Notes** - addTaskNote, summarizeTaskNotes
6. **Task Groups** - createTaskGroup, listTasksByGroup

### Future (Nice-to-Have):
7. Full-text search (PostgreSQL tsvector)
8. Semantic search (embeddings + pgvector)
9. Recurring tasks (requires schema changes)
10. Task templates

---

## Testing Checklist

After implementing these 3 critical features, test these scenarios:

### Dependencies:
- [ ] "Create a deployment task that depends on the testing task"
- [ ] "What's blocking the launch task?"
- [ ] "Show me all blocked tasks in Project X"
- [ ] "Can I start development or is something blocking it?"

### Subtasks:
- [ ] "Create a website redesign task with subtasks for wireframes, mockups, and implementation"
- [ ] "Show me the authentication task and its subtasks"
- [ ] "How many subtasks are done for the foundation work?"
- [ ] "Break down the homepage redesign into smaller tasks"

### Search:
- [ ] "Find tasks about authentication"
- [ ] "Show me tasks mentioning database"
- [ ] "Search for tasks related to the login feature"
- [ ] "What tasks reference the API?"

---

## Database Schema Confirmation

All required fields already exist:

```sql
-- tasks table has:
parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL  ✓

-- For search:
title VARCHAR(200)  ✓
description TEXT  ✓

-- task_notes table exists:
task_id UUID REFERENCES tasks(id)  ✓
content TEXT  ✓
```

**No schema changes needed - just expose existing functionality!**

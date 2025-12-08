# Agent Tool Development Guide
## Building New Tools for GroosHub AI Agents

> **Version**: 1.0
> **Last Updated**: 2025-12-02
> **Applies To**: Vercel AI SDK v5, Next.js 15.5.4
> **Context**: GroosHub Location Agent and Future Agents

---

## Table of Contents

1. [Overview](#overview)
2. [Tool Architecture](#tool-architecture)
3. [Quick Start Guide](#quick-start-guide)
4. [Step-by-Step Tool Creation](#step-by-step-tool-creation)
5. [Best Practices](#best-practices)
6. [Security Considerations](#security-considerations)
7. [Testing Tools](#testing-tools)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

---

## Overview

### What Are Agent Tools?

Agent tools are functions that AI agents can invoke to interact with your application's data and services. They enable:

- **Data Access**: Query databases, APIs, files
- **Actions**: Perform operations on behalf of users
- **Context**: Provide agents with real-time information
- **Capabilities**: Extend what agents can do beyond text generation

### GroosHub Tool Architecture

**Key Decision**: Tools are defined **inline** in the API route rather than separate files.

**Why?**
- Enables userId injection via closure scope
- No need to expose userId as LLM parameter
- Type-safe with no runtime overhead
- Simpler access control

**Location**: `src/app/api/chat/route.ts`

**Pattern**:
```typescript
const locationTools = {
  toolName: tool({
    description: `Tool description for LLM`,
    inputSchema: z.object({ /* params */ }),
    async execute({ param1, param2 }) {
      // userId available in closure scope
      // Implement tool logic here
      return { success: true, data: result };
    }
  }),
  // More tools...
};
```

---

## Tool Architecture

### Components of a Tool

Every tool has three essential parts:

#### 1. Description
```typescript
description: `Clear description of what the tool does.

Use this tool when:
- User asks about X
- User wants to do Y
- User needs information about Z

The tool returns: description of output structure`
```

**Purpose**: Helps the LLM decide when and how to use the tool

**Best Practices**:
- Start with a one-line summary
- Provide specific use cases
- Describe the return value
- Use examples if helpful

#### 2. Input Schema (Zod)
```typescript
inputSchema: z.object({
  requiredParam: z.string(),
  optionalParam: z.number().optional(),
  enumParam: z.enum(['option1', 'option2']),
  arrayParam: z.array(z.string()).min(1).max(10),
})
```

**Purpose**: Validates and types the input from the LLM

**Available Validators**:
- `z.string()` - String values
- `z.number()` - Numeric values
- `z.boolean()` - True/false
- `z.enum([...])` - Constrained choices
- `z.array(...)` - Arrays with optional min/max
- `z.object({...})` - Nested objects
- `z.uuid()` - UUID strings
- `.optional()` - Makes parameter optional
- `.min(n)` / `.max(n)` - Constraints
- `.default(value)` - Default values

#### 3. Execute Function
```typescript
async execute({ param1, param2 }) {
  try {
    // 1. Access userId from closure
    const sql = getDbConnection();

    // 2. Perform operation
    const results = await sql`
      SELECT * FROM table
      WHERE user_id = ${userId}
        AND param = ${param1}
    `;

    // 3. Format response
    return {
      success: true,
      data: results,
      count: results.length,
    };
  } catch (error) {
    // 4. Error handling
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Quick Start Guide

### Creating Your First Tool

**Example**: Build a tool that lists user's favorite colors

```typescript
// In src/app/api/chat/route.ts

const myTools = {
  listFavoriteColors: tool({
    description: `Get the user's saved favorite colors.

    Use this tool when user asks about their color preferences or favorite colors.

    Returns: List of colors with hex codes and names.`,

    inputSchema: z.object({
      limit: z.number().min(1).max(10).optional(),
    }),

    async execute({ limit = 5 }) {
      try {
        const sql = getDbConnection();

        // userId available from closure scope
        const results = await sql`
          SELECT color_name, hex_code, created_at
          FROM user_colors
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

        return {
          success: true,
          colors: results.map(r => ({
            name: r.color_name,
            hex: r.hex_code,
            savedAt: r.created_at,
          })),
          count: results.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch colors',
        };
      }
    },
  }),
};
```

**That's it!** The LLM can now use this tool.

---

## Step-by-Step Tool Creation

### Step 1: Define Your Tool's Purpose

Ask yourself:
1. What problem does this tool solve?
2. What data does it need from the user (via LLM)?
3. What data does it need from the system (database, APIs)?
4. What should it return?
5. When should the LLM call this tool?

**Example Planning**:
```
Tool: compareLocations
Purpose: Compare multiple saved locations
Inputs: Array of location IDs (2-4 items)
System Data: Location data from database
Returns: Side-by-side comparison of key metrics
LLM Trigger: "Compare Amsterdam and Utrecht" or "Which location is better for families?"
```

### Step 2: Choose Input Parameters

Design the schema:

```typescript
inputSchema: z.object({
  // Identify which locations to compare
  locationIds: z.array(z.string().uuid())
    .min(2)  // Must compare at least 2
    .max(4), // At most 4 for readability

  // Optional: which categories to compare
  categories: z.array(z.enum([
    'demographics',
    'health',
    'safety',
    'livability',
    'residential',
    'amenities'
  ])).optional(),
})
```

**Considerations**:
- Required vs optional parameters
- Validation constraints (min/max, patterns)
- Enum values for constrained choices
- Default values for optional parameters

### Step 3: Implement Access Control

**Always verify userId access before returning data**:

```typescript
async execute({ locationIds }) {
  const sql = getDbConnection();

  // Check access (owned OR shared)
  const results = await sql`
    SELECT *
    FROM saved_locations
    WHERE id = ANY(${locationIds})
      AND (
        user_id = ${userId}  -- Owned by user
        OR EXISTS (          -- OR shared with user
          SELECT 1
          FROM location_shares
          WHERE saved_location_id = saved_locations.id
            AND shared_with_user_id = ${userId}
        )
      )
  `;

  // Verify all requested IDs are accessible
  if (results.length < locationIds.length) {
    return {
      success: false,
      error: `Only ${results.length} of ${locationIds.length} locations accessible`
    };
  }

  // Continue with tool logic...
}
```

**Security Principle**: Never trust input. Always verify access rights.

### Step 4: Query Data

**Use Tagged Template Queries** for SQL injection protection:

```typescript
// ✅ GOOD - Parameterized query
const results = await sql`
  SELECT * FROM table
  WHERE id = ${userId}
    AND category = ${category}
`;

// ❌ BAD - String concatenation (SQL injection risk)
const results = await sql(`SELECT * FROM table WHERE id = ${userId}`);
```

**Handle Multiple Queries**:

```typescript
// Parallel queries for performance
const [demographics, safety, amenities] = await Promise.all([
  sql`SELECT * FROM demographics WHERE location_id = ${locationId}`,
  sql`SELECT * FROM safety WHERE location_id = ${locationId}`,
  sql`SELECT * FROM amenities WHERE location_id = ${locationId}`,
]);
```

### Step 5: Format Response

**Design LLM-friendly output**:

```typescript
return {
  success: true,

  // Summary for quick understanding
  summary: {
    total: results.length,
    categories: ['demographics', 'safety'],
  },

  // Detailed data
  locations: results.map(loc => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,

    // Simplified metrics
    keyMetrics: {
      population: loc.population,
      safetyScore: loc.safety_score,
      amenitiesNearby: loc.amenities_count,
    },
  })),

  // Metadata
  fetchedAt: new Date().toISOString(),
};
```

**Guidelines**:
- Keep nested objects shallow (2-3 levels max)
- Use descriptive property names
- Include summary/metadata
- Limit array sizes (top 10-20 items)
- Format numbers for readability

### Step 6: Error Handling

**Comprehensive error handling**:

```typescript
async execute({ param }) {
  try {
    // Validation
    if (!param) {
      return { success: false, error: 'Parameter is required' };
    }

    // Database query
    const results = await sql`SELECT ...`;

    // Check results
    if (results.length === 0) {
      return {
        success: false,
        error: 'No data found for this parameter'
      };
    }

    // Success path
    return { success: true, data: results };

  } catch (error) {
    // Log error for debugging
    console.error('[Tool Error]', error);

    // Return user-friendly error
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred'
    };
  }
}
```

**Error Response Structure**:
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;  // Optional: debug information
  code?: string;      // Optional: error code
}
```

### Step 7: Add Tool to Agent

**Integrate into the tools object**:

```typescript
// In src/app/api/chat/route.ts

const locationTools = {
  // Existing tools...
  listUserSavedLocations: tool({ ... }),
  getLocationData: tool({ ... }),

  // Your new tool
  yourNewTool: tool({
    description: `...`,
    inputSchema: z.object({ ... }),
    async execute({ ... }) {
      // Implementation
    }
  }),
};

// Pass to streamText
const result = streamText({
  model,
  messages,
  tools: locationTools,  // All tools available to agent
  stopWhen: stepCountIs(10),
});
```

---

## Best Practices

### 1. Tool Naming

**Convention**: `verbNoun` format

```typescript
// ✅ GOOD
listUserSavedLocations
getLocationData
compareLocations
searchAmenities
explainDataSource

// ❌ BAD
locations          // Too vague
getUsersLocations  // Apostrophe issues
get_location_data  // Snake case (use camelCase)
```

### 2. Description Writing

**Structure**:
1. One-line summary
2. Use cases ("Use this tool when...")
3. Return value description

**Example**:
```typescript
description: `Get demographic data for a specific location.

Use this tool when user asks about:
- Population statistics
- Age distribution
- Income levels
- Household composition

Returns: Detailed demographic breakdown at neighborhood, district, or municipality level.`
```

**Tips**:
- Write for the LLM, not humans
- Be specific about triggers
- Describe output format
- Include examples if complex

### 3. Input Validation

**Always validate at multiple levels**:

```typescript
inputSchema: z.object({
  // Type + constraints
  locationId: z.string().uuid(),

  // Enum for limited choices
  category: z.enum(['demographics', 'health', 'safety']),

  // Numeric constraints
  limit: z.number().min(1).max(100).default(10),

  // Optional with default
  includeMetadata: z.boolean().default(false),
}),

async execute({ locationId, category, limit, includeMetadata }) {
  // Additional runtime validation if needed
  if (locationId.length !== 36) {
    return { success: false, error: 'Invalid location ID format' };
  }

  // Continue...
}
```

### 4. Database Queries

**Optimize for performance**:

```typescript
// ✅ GOOD - Fetch only needed columns
const results = await sql`
  SELECT id, name, address, location_data
  FROM saved_locations
  WHERE user_id = ${userId}
  LIMIT 10
`;

// ❌ BAD - Fetch all columns unnecessarily
const results = await sql`
  SELECT *
  FROM saved_locations
  WHERE user_id = ${userId}
`;

// ✅ GOOD - Use indexes
const results = await sql`
  SELECT *
  FROM saved_locations
  WHERE user_id = ${userId}  -- Indexed column
    AND id = ${locationId}   -- Primary key
`;

// ❌ BAD - Filter in application code
const allLocations = await sql`SELECT * FROM saved_locations`;
const userLocations = allLocations.filter(l => l.user_id === userId);
```

### 5. Response Formatting

**Limit data sent to LLM**:

```typescript
// ✅ GOOD - Top 10 results
return {
  success: true,
  topResults: results.slice(0, 10),
  totalCount: results.length,
  hasMore: results.length > 10,
};

// ❌ BAD - Return 1000s of items
return {
  success: true,
  results: results,  // Could be huge!
};
```

**Use human-readable formats**:

```typescript
// ✅ GOOD - Formatted for LLM
{
  locationName: "Amsterdam West",
  population: "12,800 residents",
  safetyScore: "0.4 (better than average)",
  nearbyRestaurants: "23 within 500m"
}

// ❌ BAD - Raw database values
{
  loc_name: "Amsterdam West",
  pop: 12800,
  safety_scr: 0.4,
  rest_cnt: 23,
  rest_dist: 500
}
```

### 6. Error Messages

**Be specific and actionable**:

```typescript
// ✅ GOOD
return {
  success: false,
  error: 'Location not found or you do not have access. Please check the location ID and try again.'
};

// ❌ BAD
return {
  success: false,
  error: 'Error'
};
```

**Error Hierarchy**:
1. Permission errors: "You do not have access to this resource"
2. Not found errors: "Location with ID ... not found"
3. Validation errors: "Invalid parameter: limit must be between 1 and 100"
4. System errors: "Database connection failed. Please try again later"

### 7. Closure Scope Usage

**Use closure variables for context**:

```typescript
// userId is available in closure (from route handler)
const locationTools = {
  myTool: tool({
    description: `...`,
    inputSchema: z.object({
      locationId: z.string().uuid(),
      // NO userId parameter - it's in closure!
    }),
    async execute({ locationId }) {
      // userId available from parent scope
      const sql = getDbConnection();
      const results = await sql`
        SELECT * FROM locations
        WHERE id = ${locationId}
          AND user_id = ${userId}  // From closure
      `;

      return { success: true, data: results };
    },
  }),
};
```

**Benefits**:
- No need to expose userId to LLM
- Type-safe access
- Cleaner tool signatures
- Better security

---

## Security Considerations

### 1. Access Control

**Always verify ownership or shared access**:

```typescript
const results = await sql`
  SELECT * FROM resource
  WHERE id = ${resourceId}
    AND (
      user_id = ${userId}  -- User owns it
      OR EXISTS (          -- OR user has shared access
        SELECT 1 FROM shares
        WHERE resource_id = resource.id
          AND shared_with_user_id = ${userId}
      )
    )
`;
```

### 2. SQL Injection Prevention

**Use parameterized queries** (tagged templates):

```typescript
// ✅ SAFE - Parameterized
const results = await sql`
  SELECT * FROM table
  WHERE column = ${userInput}
`;

// ❌ UNSAFE - String concatenation
const results = await sql(`
  SELECT * FROM table
  WHERE column = '${userInput}'
`);
```

### 3. Rate Limiting

**For expensive operations**:

```typescript
async execute({ locationId }) {
  // Check rate limit
  const requestCount = await redis.incr(`tool:compare:${userId}`);
  await redis.expire(`tool:compare:${userId}`, 60);  // 60 seconds

  if (requestCount > 10) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again in 1 minute.'
    };
  }

  // Continue with tool logic...
}
```

### 4. Data Sanitization

**Sanitize output before returning**:

```typescript
return {
  success: true,
  data: results.map(item => ({
    id: item.id,
    name: item.name,
    // Don't include sensitive fields
    // email: item.email,  ❌
    // password: item.password,  ❌
    // apiKey: item.api_key,  ❌
  }))
};
```

### 5. Input Validation

**Validate beyond Zod schema**:

```typescript
async execute({ email }) {
  // Zod validates it's a string, but...

  // Additional validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: 'Invalid email format'
    };
  }

  // Continue...
}
```

---

## Testing Tools

### 1. Unit Testing

**Test tool logic independently**:

```typescript
// tests/tools/myTool.test.ts

import { describe, it, expect } from 'vitest';

describe('myTool', () => {
  it('should return user data when valid ID provided', async () => {
    const mockUserId = 'user-123';
    const mockLocationId = 'loc-456';

    // Mock database
    const mockSql = vi.fn().mockResolvedValue([
      { id: 'loc-456', name: 'Test Location' }
    ]);

    // Test tool execute function
    const result = await toolExecute({
      locationId: mockLocationId
    }, mockUserId, mockSql);

    expect(result.success).toBe(true);
    expect(result.data[0].name).toBe('Test Location');
  });

  it('should return error when location not found', async () => {
    const mockSql = vi.fn().mockResolvedValue([]);

    const result = await toolExecute({
      locationId: 'invalid-id'
    }, 'user-123', mockSql);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
```

### 2. Integration Testing

**Test with real agent**:

```typescript
// Test in chat API route
POST /api/chat
{
  "messages": [
    {
      "role": "user",
      "content": "List my saved locations"
    }
  ],
  "chatId": "test-chat-id",
  "modelId": "gpt-4o"
}

// Verify:
// 1. Tool is called
// 2. Returns expected data
// 3. LLM formats response appropriately
```

### 3. Manual Testing

**Test via chat interface**:

1. Open AI Assistant page
2. Send messages that should trigger tools:
   - "Show me my saved locations"
   - "Compare Amsterdam and Utrecht"
   - "What restaurants are near location X?"
3. Verify:
   - Tool is invoked
   - Data is returned
   - Response is formatted well
   - No errors

### 4. Error Scenario Testing

Test edge cases:
- Empty results
- Invalid IDs
- Unauthorized access
- Database errors
- Network timeouts

---

## Common Patterns

### Pattern 1: List Resource

**Get user's owned resources**:

```typescript
listUserResources: tool({
  description: `Get all resources owned by or shared with the user.`,
  inputSchema: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }),
  async execute({ limit, offset }) {
    const sql = getDbConnection();
    const results = await sql`
      SELECT id, name, created_at
      FROM resources
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      success: true,
      resources: results,
      count: results.length,
      hasMore: results.length === limit,
    };
  },
}),
```

### Pattern 2: Get Single Resource

**Fetch specific resource with access control**:

```typescript
getResourceDetails: tool({
  description: `Get detailed information about a specific resource.`,
  inputSchema: z.object({
    resourceId: z.string().uuid(),
  }),
  async execute({ resourceId }) {
    const sql = getDbConnection();
    const results = await sql`
      SELECT *
      FROM resources
      WHERE id = ${resourceId}
        AND (user_id = ${userId} OR is_public = true)
    `;

    if (results.length === 0) {
      return {
        success: false,
        error: 'Resource not found or access denied'
      };
    }

    return {
      success: true,
      resource: results[0],
    };
  },
}),
```

### Pattern 3: Search/Filter

**Search with filters**:

```typescript
searchResources: tool({
  description: `Search resources by keyword and filters.`,
  inputSchema: z.object({
    query: z.string().min(1),
    category: z.enum(['type1', 'type2', 'type3']).optional(),
    limit: z.number().default(10),
  }),
  async execute({ query, category, limit }) {
    const sql = getDbConnection();

    let results;
    if (category) {
      results = await sql`
        SELECT * FROM resources
        WHERE user_id = ${userId}
          AND category = ${category}
          AND (name ILIKE ${`%${query}%`} OR description ILIKE ${`%${query}%`})
        LIMIT ${limit}
      `;
    } else {
      results = await sql`
        SELECT * FROM resources
        WHERE user_id = ${userId}
          AND (name ILIKE ${`%${query}%`} OR description ILIKE ${`%${query}%`})
        LIMIT ${limit}
      `;
    }

    return {
      success: true,
      results,
      query,
      count: results.length,
    };
  },
}),
```

### Pattern 4: Comparison

**Compare multiple items**:

```typescript
compareResources: tool({
  description: `Compare multiple resources side-by-side.`,
  inputSchema: z.object({
    resourceIds: z.array(z.string().uuid()).min(2).max(4),
  }),
  async execute({ resourceIds }) {
    const sql = getDbConnection();
    const results = await sql`
      SELECT id, name, metric1, metric2, metric3
      FROM resources
      WHERE id = ANY(${resourceIds})
        AND user_id = ${userId}
    `;

    if (results.length < resourceIds.length) {
      return {
        success: false,
        error: 'Some resources not found or inaccessible'
      };
    }

    return {
      success: true,
      comparison: results.map(r => ({
        id: r.id,
        name: r.name,
        metrics: {
          metric1: r.metric1,
          metric2: r.metric2,
          metric3: r.metric3,
        }
      })),
    };
  },
}),
```

### Pattern 5: Aggregation

**Aggregate data across resources**:

```typescript
getResourceStats: tool({
  description: `Get aggregate statistics for user's resources.`,
  inputSchema: z.object({
    category: z.enum(['all', 'type1', 'type2']).default('all'),
  }),
  async execute({ category }) {
    const sql = getDbConnection();

    const results = await sql`
      SELECT
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        SUM(value) as total_value
      FROM resources
      WHERE user_id = ${userId}
        ${category !== 'all' ? sql`AND category = ${category}` : sql``}
    `;

    return {
      success: true,
      stats: {
        total: parseInt(results[0].total),
        averageRating: parseFloat(results[0].avg_rating),
        totalValue: parseFloat(results[0].total_value),
        category,
      },
    };
  },
}),
```

### Pattern 6: Educational/Helper

**Provide static information**:

```typescript
explainConcept: tool({
  description: `Explain a specific concept or feature.`,
  inputSchema: z.object({
    concept: z.enum(['concept1', 'concept2', 'concept3']),
  }),
  async execute({ concept }) {
    const explanations = {
      concept1: {
        title: 'Concept 1',
        description: 'Detailed explanation...',
        useCases: ['Use case 1', 'Use case 2'],
        examples: ['Example 1', 'Example 2'],
      },
      concept2: {
        // ...
      },
      concept3: {
        // ...
      },
    };

    return {
      success: true,
      explanation: explanations[concept],
    };
  },
}),
```

---

## Troubleshooting

### Issue: Tool not being called

**Symptoms**: LLM doesn't use your tool even when it should

**Possible Causes**:
1. **Poor description** - LLM doesn't know when to use it
2. **Similar existing tool** - LLM prefers another tool
3. **Too specific** - Narrow use case, rarely triggered
4. **Schema mismatch** - LLM can't provide required parameters

**Solutions**:
```typescript
// ✅ GOOD - Clear, specific description
description: `Get restaurant amenities near a location.

Use this tool when user asks about:
- "What restaurants are nearby?"
- "Show me places to eat"
- "Find restaurants within 500m"

Returns: List of restaurants with names, distances, types.`

// ❌ BAD - Vague description
description: `Get amenities`
```

### Issue: TypeScript errors

**Symptoms**: Build fails with type errors

**Possible Causes**:
1. Zod schema doesn't match execute parameters
2. Return type inconsistent
3. Database types not imported

**Solutions**:
```typescript
// ✅ GOOD - Matching types
inputSchema: z.object({
  locationId: z.string().uuid(),
}),
async execute({ locationId }) {  // Matches schema
  // ...
}

// ❌ BAD - Mismatched types
inputSchema: z.object({
  locationId: z.string().uuid(),
}),
async execute({ locId }) {  // Wrong parameter name!
  // ...
}
```

### Issue: Database query failures

**Symptoms**: Tool returns errors or empty results

**Possible Causes**:
1. SQL syntax error
2. Missing table/column
3. Access control blocking results
4. Type casting issues

**Solutions**:
```typescript
// Debug query
try {
  const results = await sql`SELECT ...`;
  console.log('Query results:', results);
  return { success: true, data: results };
} catch (error) {
  console.error('Query error:', error);
  return { success: false, error: error.message };
}
```

### Issue: Tool returns wrong data

**Symptoms**: Tool executes but returns incorrect/incomplete data

**Checklist**:
- [ ] Verify SQL query logic
- [ ] Check column names match database
- [ ] Confirm data formatting
- [ ] Validate access control
- [ ] Test with known data

### Issue: Performance problems

**Symptoms**: Tool is slow, times out

**Solutions**:
1. **Add database indexes**
   ```sql
   CREATE INDEX idx_resources_user_id ON resources(user_id);
   ```

2. **Limit result sets**
   ```typescript
   LIMIT ${Math.min(limit, 100)}  -- Never more than 100
   ```

3. **Use parallel queries**
   ```typescript
   const [data1, data2] = await Promise.all([
     sql`SELECT ...`,
     sql`SELECT ...`,
   ]);
   ```

4. **Add caching** (if data rarely changes)
   ```typescript
   const cached = await redis.get(`tool:${cacheKey}`);
   if (cached) return JSON.parse(cached);

   const fresh = await fetchData();
   await redis.setex(`tool:${cacheKey}`, 3600, JSON.stringify(fresh));
   return fresh;
   ```

---

## Examples

### Example 1: Simple Data Retrieval

```typescript
getUserProfile: tool({
  description: `Get the current user's profile information.

  Use this tool when user asks about their profile, account, or personal details.

  Returns: User's name, email, role, and account creation date.`,

  inputSchema: z.object({}),  // No parameters needed

  async execute() {
    try {
      const sql = getDbConnection();
      const results = await sql`
        SELECT name, email, role, created_at
        FROM users
        WHERE id = ${userId}
      `;

      if (results.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = results[0];
      return {
        success: true,
        profile: {
          name: user.name,
          email: user.email,
          role: user.role,
          memberSince: user.created_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      };
    }
  },
}),
```

### Example 2: Filtered Search

```typescript
searchProjects: tool({
  description: `Search user's projects by keyword and status.

  Use this tool when user wants to find specific projects or filter by status.

  Returns: Matching projects with key details.`,

  inputSchema: z.object({
    keyword: z.string().min(1),
    status: z.enum(['active', 'archived', 'all']).default('all'),
    limit: z.number().min(1).max(50).default(10),
  }),

  async execute({ keyword, status, limit }) {
    try {
      const sql = getDbConnection();

      const baseQuery = sql`
        SELECT id, name, description, status, created_at
        FROM projects
        WHERE user_id = ${userId}
          AND (
            name ILIKE ${`%${keyword}%`}
            OR description ILIKE ${`%${keyword}%`}
          )
      `;

      const results = status === 'all'
        ? await sql`${baseQuery} LIMIT ${limit}`
        : await sql`${baseQuery} AND status = ${status} LIMIT ${limit}`;

      return {
        success: true,
        projects: results,
        query: keyword,
        status,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
}),
```

### Example 3: Multi-Step Operation

```typescript
createProjectWithTasks: tool({
  description: `Create a new project and initial tasks in one operation.

  Use this tool when user wants to start a new project with predefined tasks.

  Returns: Created project with task IDs.`,

  inputSchema: z.object({
    projectName: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    initialTasks: z.array(z.string().min(1)).min(1).max(10),
  }),

  async execute({ projectName, description, initialTasks }) {
    const sql = getDbConnection();

    try {
      // Start transaction
      await sql.begin(async sql => {
        // 1. Create project
        const [project] = await sql`
          INSERT INTO projects (user_id, name, description, created_at)
          VALUES (${userId}, ${projectName}, ${description || ''}, NOW())
          RETURNING id, name, created_at
        `;

        // 2. Create tasks
        const tasks = await Promise.all(
          initialTasks.map(taskName =>
            sql`
              INSERT INTO tasks (project_id, name, status, created_at)
              VALUES (${project.id}, ${taskName}, 'pending', NOW())
              RETURNING id, name
            `
          )
        );

        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            createdAt: project.created_at,
            tasks: tasks.map(([t]) => ({ id: t.id, name: t.name })),
          },
        };
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      };
    }
  },
}),
```

### Example 4: External API Integration

```typescript
getWeatherForLocation: tool({
  description: `Get current weather for a saved location.

  Use this tool when user asks about weather conditions at a location.

  Returns: Temperature, conditions, forecast.`,

  inputSchema: z.object({
    locationId: z.string().uuid(),
  }),

  async execute({ locationId }) {
    try {
      const sql = getDbConnection();

      // 1. Get location coordinates
      const results = await sql`
        SELECT coordinates, name
        FROM saved_locations
        WHERE id = ${locationId}
          AND user_id = ${userId}
      `;

      if (results.length === 0) {
        return { success: false, error: 'Location not found' };
      }

      const { coordinates, name } = results[0];

      // 2. Fetch weather from external API
      const response = await fetch(
        `https://api.weather.com/v1/current?lat=${coordinates.lat}&lon=${coordinates.lon}&apiKey=${process.env.WEATHER_API_KEY}`
      );

      if (!response.ok) {
        return { success: false, error: 'Weather API request failed' };
      }

      const weather = await response.json();

      return {
        success: true,
        location: name,
        weather: {
          temperature: weather.temp,
          conditions: weather.conditions,
          humidity: weather.humidity,
          forecast: weather.forecast,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      };
    }
  },
}),
```

---

## Conclusion

Building effective agent tools requires:

1. **Clear Purpose** - Know what the tool should do
2. **Good Description** - Help LLM understand when to use it
3. **Proper Validation** - Zod schemas + runtime checks
4. **Access Control** - Always verify user permissions
5. **Error Handling** - Graceful failures with helpful messages
6. **Performance** - Optimize queries, limit results
7. **Security** - Prevent injection, sanitize data
8. **Testing** - Unit, integration, and manual testing

Follow this guide and the patterns demonstrated in the location agent tools to build robust, secure, and effective tools for your AI agents.

---

## Additional Resources

- **Vercel AI SDK Documentation**: https://sdk.vercel.ai/docs
- **Zod Documentation**: https://zod.dev
- **CHATBOT_REBUILD_ROADMAP.md**: Project roadmap and progress
- **LOCATION_AGENT_OUTLINE.md**: Location agent specification
- **src/app/api/chat/route.ts**: Reference implementation

---

**Version History**:
- v1.0 (2025-12-02): Initial guide based on location agent implementation

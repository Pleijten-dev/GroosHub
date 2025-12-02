/**
 * User Memory Management
 * Handles database operations for user-specific LLM memory
 *
 * Inspired by Claude's memory system:
 * - Stores user preferences, patterns, and context
 * - Brief, structured memory (~500 tokens max)
 * - Updated by LLM analysis of conversations
 * - Injected into system prompts for personalization
 */

import { getDbConnection } from '@/lib/db/connection';

// ============================================
// Types
// ============================================

export interface UserMemory {
  user_id: number;
  memory_content: string;
  user_name?: string | null;
  user_role?: string | null;
  preferences: Record<string, unknown>;
  interests: string[];
  patterns: MemoryPattern[];
  context: MemoryContext[];
  total_updates: number;
  last_analysis_at: Date | null;
  token_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryPattern {
  type: string;  // 'translation', 'workflow', 'analysis', etc.
  description: string;
  frequency?: number;
  examples?: string[];
}

export interface MemoryContext {
  key: string;  // 'current_project', 'focus_area', etc.
  value: string;
  expires_at?: string;  // ISO date string for time-sensitive context
}

export interface MemoryUpdate {
  id: string;
  user_id: number;
  previous_content: string | null;
  new_content: string;
  change_summary: string | null;
  change_type: 'initial' | 'addition' | 'modification' | 'removal' | 'manual';
  trigger_source: 'chat' | 'manual' | 'api' | 'system';
  trigger_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CreateMemoryParams {
  userId: number;
  memoryContent: string;
  userName?: string;
  userRole?: string;
  preferences?: Record<string, unknown>;
  interests?: string[];
  patterns?: MemoryPattern[];
  context?: MemoryContext[];
}

export interface UpdateMemoryParams {
  userId: number;
  memoryContent: string;
  changeSummary?: string;
  changeType?: 'addition' | 'modification' | 'removal' | 'manual';
  triggerSource?: 'chat' | 'manual' | 'api' | 'system';
  triggerId?: string;
  metadata?: Record<string, unknown>;
  userName?: string;
  userRole?: string;
  preferences?: Record<string, unknown>;
  interests?: string[];
  patterns?: MemoryPattern[];
  context?: MemoryContext[];
}

// ============================================
// Memory Operations
// ============================================

/**
 * Get user memory
 * Returns existing memory or creates an empty one
 */
export async function getUserMemory(userId: number): Promise<UserMemory> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM get_user_memory(${userId})
  `;

  if (result.length === 0) {
    // Return default empty memory
    return {
      user_id: userId,
      memory_content: '',
      user_name: null,
      user_role: null,
      preferences: {},
      interests: [],
      patterns: [],
      context: [],
      total_updates: 0,
      last_analysis_at: null,
      token_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  const row = result[0] as {
    user_id: number;
    memory_content: string;
    user_name: string | null;
    user_role: string | null;
    preferences: unknown;
    interests: unknown;
    patterns: unknown;
    context: unknown;
    token_count: number;
    last_analysis_at: Date | null;
  };

  return {
    user_id: row.user_id,
    memory_content: row.memory_content || '',
    user_name: row.user_name,
    user_role: row.user_role,
    preferences: (row.preferences as Record<string, unknown>) || {},
    interests: (row.interests as string[]) || [],
    patterns: (row.patterns as MemoryPattern[]) || [],
    context: (row.context as MemoryContext[]) || [],
    total_updates: 0,
    last_analysis_at: row.last_analysis_at,
    token_count: row.token_count || 0,
    created_at: new Date(),
    updated_at: new Date()
  };
}

/**
 * Create initial memory for a user
 */
export async function createUserMemory(params: CreateMemoryParams): Promise<void> {
  const db = getDbConnection();

  const tokenCount = estimateTokenCount(params.memoryContent);

  await db`
    INSERT INTO user_memories (
      user_id,
      memory_content,
      user_name,
      user_role,
      preferences,
      interests,
      patterns,
      context,
      token_count,
      last_analysis_at,
      created_at,
      updated_at
    ) VALUES (
      ${params.userId},
      ${params.memoryContent},
      ${params.userName || null},
      ${params.userRole || null},
      ${JSON.stringify(params.preferences || {})},
      ${JSON.stringify(params.interests || [])},
      ${JSON.stringify(params.patterns || [])},
      ${JSON.stringify(params.context || [])},
      ${tokenCount},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      memory_content = EXCLUDED.memory_content,
      user_name = EXCLUDED.user_name,
      user_role = EXCLUDED.user_role,
      preferences = EXCLUDED.preferences,
      interests = EXCLUDED.interests,
      patterns = EXCLUDED.patterns,
      context = EXCLUDED.context,
      token_count = EXCLUDED.token_count,
      last_analysis_at = EXCLUDED.last_analysis_at,
      updated_at = NOW()
  `;

  console.log(`[MemoryStore] Created/updated memory for user ${params.userId} (${tokenCount} tokens)`);

  // Record the initial memory creation
  await db`
    INSERT INTO user_memory_updates (
      user_id,
      previous_content,
      new_content,
      change_summary,
      change_type,
      trigger_source,
      metadata,
      created_at
    ) VALUES (
      ${params.userId},
      NULL,
      ${params.memoryContent},
      'Initial memory creation',
      'initial',
      'system',
      '{}'::jsonb,
      NOW()
    )
  `;
}

/**
 * Update user memory
 */
export async function updateUserMemory(params: UpdateMemoryParams): Promise<void> {
  const db = getDbConnection();

  // Get current memory for history
  const currentMemory = await getUserMemory(params.userId);

  const tokenCount = estimateTokenCount(params.memoryContent);

  // Check token limit (soft limit of ~500 tokens / 2000 characters)
  if (tokenCount > 600) {
    console.warn(`[MemoryStore] Warning: Memory for user ${params.userId} exceeds recommended token limit (${tokenCount} > 600)`);
  }

  await db`
    INSERT INTO user_memories (
      user_id,
      memory_content,
      user_name,
      user_role,
      preferences,
      interests,
      patterns,
      context,
      token_count,
      last_analysis_at,
      created_at,
      updated_at
    ) VALUES (
      ${params.userId},
      ${params.memoryContent},
      ${params.userName || null},
      ${params.userRole || null},
      ${JSON.stringify(params.preferences || {})},
      ${JSON.stringify(params.interests || [])},
      ${JSON.stringify(params.patterns || [])},
      ${JSON.stringify(params.context || [])},
      ${tokenCount},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      memory_content = EXCLUDED.memory_content,
      user_name = COALESCE(EXCLUDED.user_name, user_memories.user_name),
      user_role = COALESCE(EXCLUDED.user_role, user_memories.user_role),
      preferences = EXCLUDED.preferences,
      interests = EXCLUDED.interests,
      patterns = EXCLUDED.patterns,
      context = EXCLUDED.context,
      token_count = EXCLUDED.token_count,
      last_analysis_at = EXCLUDED.last_analysis_at,
      updated_at = NOW()
  `;

  console.log(`[MemoryStore] Updated memory for user ${params.userId} (${tokenCount} tokens)`);

  // Record the update in history
  await db`
    INSERT INTO user_memory_updates (
      user_id,
      previous_content,
      new_content,
      change_summary,
      change_type,
      trigger_source,
      trigger_id,
      metadata,
      created_at
    ) VALUES (
      ${params.userId},
      ${currentMemory.memory_content || null},
      ${params.memoryContent},
      ${params.changeSummary || null},
      ${params.changeType || 'modification'},
      ${params.triggerSource || 'manual'},
      ${params.triggerId || null},
      ${JSON.stringify(params.metadata || {})},
      NOW()
    )
  `;
}

/**
 * Delete user memory (for privacy/GDPR compliance)
 */
export async function deleteUserMemory(userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM user_memories
    WHERE user_id = ${userId}
  `;

  console.log(`[MemoryStore] Deleted memory for user ${userId}`);
}

/**
 * Get memory update history
 */
export async function getMemoryHistory(
  userId: number,
  limit: number = 10
): Promise<MemoryUpdate[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      user_id,
      previous_content,
      new_content,
      change_summary,
      change_type,
      trigger_source,
      trigger_id,
      metadata,
      created_at
    FROM user_memory_updates
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    id: row.id as string,
    user_id: row.user_id as number,
    previous_content: row.previous_content as string | null,
    new_content: row.new_content as string,
    change_summary: row.change_summary as string | null,
    change_type: row.change_type as 'initial' | 'addition' | 'modification' | 'removal' | 'manual',
    trigger_source: row.trigger_source as 'chat' | 'manual' | 'api' | 'system',
    trigger_id: row.trigger_id as string | null,
    metadata: row.metadata as Record<string, unknown>,
    created_at: row.created_at as Date
  }));
}

// ============================================
// Utility Functions
// ============================================

/**
 * Estimate token count from text
 * Simple estimation: ~4 characters per token
 */
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Format memory for system prompt
 * Converts structured memory into a concise text format
 */
export function formatMemoryForPrompt(memory: UserMemory): string {
  if (!memory.memory_content && memory.interests.length === 0 && memory.patterns.length === 0) {
    return ''; // No memory to include
  }

  const parts: string[] = [];

  // Add structured memory content if available
  if (memory.memory_content) {
    parts.push(memory.memory_content);
  } else {
    // Build memory from structured fields
    if (memory.user_name) {
      parts.push(`User: ${memory.user_name}${memory.user_role ? ` (${memory.user_role})` : ''}`);
    }

    if (memory.preferences && Object.keys(memory.preferences).length > 0) {
      const prefs = Object.entries(memory.preferences)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      parts.push(`Preferences: ${prefs}`);
    }

    if (memory.interests && memory.interests.length > 0) {
      parts.push(`Interests: ${memory.interests.join(', ')}`);
    }

    if (memory.patterns && memory.patterns.length > 0) {
      const patterns = memory.patterns
        .map(p => `${p.type}: ${p.description}`)
        .join('; ');
      parts.push(`Patterns: ${patterns}`);
    }

    if (memory.context && memory.context.length > 0) {
      const contexts = memory.context
        .filter(c => !c.expires_at || new Date(c.expires_at) > new Date()) // Filter expired context
        .map(c => `${c.key}: ${c.value}`)
        .join('; ');
      if (contexts) {
        parts.push(`Context: ${contexts}`);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Check if memory should be updated
 * Based on time since last update and conversation activity
 */
export function shouldUpdateMemory(memory: UserMemory, messageCount: number): boolean {
  // Always update if never analyzed
  if (!memory.last_analysis_at) {
    return messageCount >= 3; // Wait for at least 3 messages
  }

  // Update every 10 messages
  if (messageCount % 10 === 0) {
    return true;
  }

  // Update if it's been more than 24 hours
  const hoursSinceUpdate = (Date.now() - memory.last_analysis_at.getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) {
    return true;
  }

  return false;
}

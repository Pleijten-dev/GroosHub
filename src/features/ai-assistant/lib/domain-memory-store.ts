/**
 * Domain Memory Store
 *
 * Handles organization-wide knowledge:
 * - Explicit knowledge: Admin-entered standards, regulations, best practices
 * - Learned patterns: Cross-project insights discovered automatically
 */

import { getDbConnection } from '@/lib/db/connection';
import { nanoid } from 'nanoid';
import type {
  DomainMemory,
  DomainKnowledge,
  DomainPattern,
  MemorySource,
} from '../types/memory';

// ============================================
// Constants
// ============================================

/** Maximum token estimate for domain memory */
const MAX_TOKEN_ESTIMATE = 500;

/** Minimum confidence for patterns to be included */
const MIN_PATTERN_CONFIDENCE = 0.6;

/** Minimum project count for pattern to be considered valid */
const MIN_PROJECT_COUNT = 2;

// ============================================
// Database Operations
// ============================================

/**
 * Get domain memory for an organization
 */
export async function getDomainMemory(orgId: string): Promise<DomainMemory | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      org_id,
      explicit_knowledge,
      learned_patterns,
      token_estimate,
      last_synthesized_at,
      last_updated_by,
      created_at,
      updated_at
    FROM domain_memories
    WHERE org_id = ${orgId}
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  // Parse JSONB fields
  const explicitKnowledge = (row.explicit_knowledge as DomainKnowledge[]) || [];
  const learnedPatterns = (row.learned_patterns as DomainPattern[]) || [];

  return {
    id: row.id as string,
    orgId: row.org_id as string,
    explicitKnowledge: explicitKnowledge.map(k => ({
      ...k,
      addedAt: new Date(k.addedAt),
    })),
    learnedPatterns: learnedPatterns.map(p => ({
      ...p,
      learnedAt: new Date(p.learnedAt),
    })),
    tokenEstimate: (row.token_estimate as number) || 0,
    lastSynthesizedAt: row.last_synthesized_at ? new Date(row.last_synthesized_at as Date) : null,
    lastUpdatedBy: row.last_updated_by as number | null,
    createdAt: new Date(row.created_at as Date),
    updatedAt: new Date(row.updated_at as Date),
  };
}

/**
 * Get or create domain memory
 */
export async function getOrCreateDomainMemory(orgId: string): Promise<DomainMemory> {
  const existing = await getDomainMemory(orgId);
  if (existing) return existing;

  // Create new empty memory
  const db = getDbConnection();
  const id = nanoid();

  await db`
    INSERT INTO domain_memories (
      id,
      org_id,
      explicit_knowledge,
      learned_patterns,
      token_estimate,
      created_at,
      updated_at
    ) VALUES (
      ${id},
      ${orgId},
      '[]'::jsonb,
      '[]'::jsonb,
      0,
      NOW(),
      NOW()
    )
  `;

  return {
    id,
    orgId,
    explicitKnowledge: [],
    learnedPatterns: [],
    tokenEstimate: 0,
    lastSynthesizedAt: null,
    lastUpdatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Save domain memory
 */
async function saveDomainMemory(memory: DomainMemory, updatedBy?: number): Promise<void> {
  const db = getDbConnection();

  const tokenEstimate = estimateTokens(memory);

  if (tokenEstimate > MAX_TOKEN_ESTIMATE) {
    console.warn(`[DomainMemory] Memory for org ${memory.orgId} exceeds token limit (${tokenEstimate} > ${MAX_TOKEN_ESTIMATE})`);
  }

  await db`
    UPDATE domain_memories
    SET
      explicit_knowledge = ${JSON.stringify(memory.explicitKnowledge)},
      learned_patterns = ${JSON.stringify(memory.learnedPatterns)},
      token_estimate = ${tokenEstimate},
      last_updated_by = ${updatedBy || memory.lastUpdatedBy || null},
      updated_at = NOW()
    WHERE id = ${memory.id}
  `;
}

// ============================================
// Explicit Knowledge Operations
// ============================================

/**
 * Add explicit knowledge (admin only)
 */
export async function addExplicitKnowledge(
  orgId: string,
  knowledge: Omit<DomainKnowledge, 'id' | 'addedAt' | 'addedBy'>,
  adminUserId: number
): Promise<DomainKnowledge> {
  const memory = await getOrCreateDomainMemory(orgId);

  const newKnowledge: DomainKnowledge = {
    id: nanoid(),
    ...knowledge,
    addedBy: adminUserId,
    addedAt: new Date(),
  };

  memory.explicitKnowledge.push(newKnowledge);
  await saveDomainMemory(memory, adminUserId);

  await recordMemoryUpdate({
    memoryId: memory.id,
    updateType: 'admin_edit',
    fieldPath: 'explicit_knowledge',
    oldValue: null,
    newValue: { category: knowledge.category, title: knowledge.title },
    source: 'admin',
    updatedBy: adminUserId,
  });

  console.log(`[DomainMemory] Added knowledge for org ${orgId}: ${knowledge.title}`);
  return newKnowledge;
}

/**
 * Update explicit knowledge
 */
export async function updateExplicitKnowledge(
  orgId: string,
  knowledgeId: string,
  updates: Partial<Omit<DomainKnowledge, 'id' | 'addedAt' | 'addedBy'>>,
  adminUserId: number
): Promise<DomainKnowledge | null> {
  const memory = await getDomainMemory(orgId);
  if (!memory) return null;

  const knowledge = memory.explicitKnowledge.find(k => k.id === knowledgeId);
  if (!knowledge) return null;

  const oldTitle = knowledge.title;

  if (updates.category) knowledge.category = updates.category;
  if (updates.title) knowledge.title = updates.title;
  if (updates.content) knowledge.content = updates.content;

  await saveDomainMemory(memory, adminUserId);

  await recordMemoryUpdate({
    memoryId: memory.id,
    updateType: 'admin_edit',
    fieldPath: 'explicit_knowledge',
    oldValue: { title: oldTitle },
    newValue: { title: knowledge.title },
    source: 'admin',
    updatedBy: adminUserId,
  });

  console.log(`[DomainMemory] Updated knowledge ${knowledge.title} for org ${orgId}`);
  return knowledge;
}

/**
 * Remove explicit knowledge
 */
export async function removeExplicitKnowledge(
  orgId: string,
  knowledgeId: string,
  adminUserId: number
): Promise<boolean> {
  const memory = await getDomainMemory(orgId);
  if (!memory) return false;

  const index = memory.explicitKnowledge.findIndex(k => k.id === knowledgeId);
  if (index === -1) return false;

  const removed = memory.explicitKnowledge.splice(index, 1)[0];
  await saveDomainMemory(memory, adminUserId);

  await recordMemoryUpdate({
    memoryId: memory.id,
    updateType: 'user_delete',
    fieldPath: 'explicit_knowledge',
    oldValue: { category: removed.category, title: removed.title },
    newValue: null,
    source: 'admin',
    updatedBy: adminUserId,
  });

  console.log(`[DomainMemory] Removed knowledge ${removed.title} from org ${orgId}`);
  return true;
}

// ============================================
// Learned Pattern Operations
// ============================================

/**
 * Add or reinforce a learned pattern
 */
export async function addLearnedPattern(
  orgId: string,
  pattern: string,
  evidence: string,
  projectId?: string
): Promise<DomainPattern> {
  const memory = await getOrCreateDomainMemory(orgId);

  // Check if similar pattern exists
  const existingIndex = memory.learnedPatterns.findIndex(
    p => p.pattern.toLowerCase() === pattern.toLowerCase()
  );

  if (existingIndex >= 0) {
    // Reinforce existing pattern
    const existing = memory.learnedPatterns[existingIndex];
    existing.projectCount += 1;
    existing.confidence = Math.min(0.95, existing.confidence + 0.05);
    existing.evidence = `${existing.evidence}; ${evidence}`;

    await saveDomainMemory(memory);

    console.log(`[DomainMemory] Reinforced pattern for org ${orgId}: "${pattern}" (projects: ${existing.projectCount})`);
    return existing;
  }

  // Add new pattern
  const newPattern: DomainPattern = {
    id: nanoid(),
    pattern,
    evidence,
    projectCount: 1,
    confidence: 0.4, // Start low, needs reinforcement
    learnedAt: new Date(),
  };

  memory.learnedPatterns.push(newPattern);
  await saveDomainMemory(memory);

  await recordMemoryUpdate({
    memoryId: memory.id,
    updateType: 'learned',
    fieldPath: 'learned_patterns',
    oldValue: null,
    newValue: { pattern },
    source: 'system',
    sourceRef: projectId,
  });

  console.log(`[DomainMemory] Added pattern for org ${orgId}: "${pattern}"`);
  return newPattern;
}

/**
 * Remove a learned pattern
 */
export async function removeLearnedPattern(
  orgId: string,
  patternId: string,
  adminUserId: number
): Promise<boolean> {
  const memory = await getDomainMemory(orgId);
  if (!memory) return false;

  const index = memory.learnedPatterns.findIndex(p => p.id === patternId);
  if (index === -1) return false;

  const removed = memory.learnedPatterns.splice(index, 1)[0];
  await saveDomainMemory(memory, adminUserId);

  await recordMemoryUpdate({
    memoryId: memory.id,
    updateType: 'user_delete',
    fieldPath: 'learned_patterns',
    oldValue: { pattern: removed.pattern },
    newValue: null,
    source: 'admin',
    updatedBy: adminUserId,
  });

  console.log(`[DomainMemory] Removed pattern "${removed.pattern}" from org ${orgId}`);
  return true;
}

// ============================================
// Formatting for Prompts
// ============================================

/**
 * Format domain memory for system prompt injection
 */
export function formatDomainMemoryForPrompt(memory: DomainMemory): string {
  const parts: string[] = [];

  // Explicit knowledge
  if (memory.explicitKnowledge.length > 0) {
    const knowledgeByCategory = new Map<string, DomainKnowledge[]>();

    for (const k of memory.explicitKnowledge) {
      const list = knowledgeByCategory.get(k.category) || [];
      list.push(k);
      knowledgeByCategory.set(k.category, list);
    }

    const knowledgeLines: string[] = [];
    for (const [category, items] of knowledgeByCategory) {
      knowledgeLines.push(`${category}:`);
      for (const item of items) {
        knowledgeLines.push(`  - ${item.title}: ${item.content}`);
      }
    }

    parts.push(`Organization knowledge:\n${knowledgeLines.join('\n')}`);
  }

  // Learned patterns (only confident ones)
  const confidentPatterns = memory.learnedPatterns
    .filter(p => p.confidence >= MIN_PATTERN_CONFIDENCE && p.projectCount >= MIN_PROJECT_COUNT)
    .sort((a, b) => b.confidence - a.confidence);

  if (confidentPatterns.length > 0) {
    const patternLines = confidentPatterns.map(
      p => `- ${p.pattern} (based on ${p.projectCount} projects)`
    );
    parts.push(`Learned patterns:\n${patternLines.join('\n')}`);
  }

  return parts.join('\n\n');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Estimate token count
 */
function estimateTokens(memory: DomainMemory): number {
  const formatted = formatDomainMemoryForPrompt(memory);
  return Math.ceil(formatted.length / 4);
}

/**
 * Record memory update
 */
async function recordMemoryUpdate(params: {
  memoryId: string;
  updateType: string;
  fieldPath?: string;
  oldValue: unknown;
  newValue: unknown;
  source: MemorySource;
  sourceRef?: string;
  updatedBy?: number;
}): Promise<void> {
  const db = getDbConnection();

  try {
    await db`
      INSERT INTO memory_updates (
        memory_type,
        memory_id,
        update_type,
        field_path,
        old_value,
        new_value,
        source,
        source_ref,
        updated_by,
        created_at
      ) VALUES (
        'domain',
        ${params.memoryId},
        ${params.updateType},
        ${params.fieldPath || null},
        ${params.oldValue ? JSON.stringify(params.oldValue) : null},
        ${params.newValue ? JSON.stringify(params.newValue) : null},
        ${params.source},
        ${params.sourceRef || null},
        ${params.updatedBy || null},
        NOW()
      )
    `;
  } catch (error) {
    console.error('[DomainMemory] Failed to record memory update:', error);
  }
}

/**
 * Get domain memory update history
 */
export async function getDomainMemoryHistory(
  orgId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  updateType: string;
  fieldPath: string | null;
  oldValue: unknown;
  newValue: unknown;
  source: MemorySource;
  updatedBy: number | null;
  createdAt: Date;
}>> {
  const memory = await getDomainMemory(orgId);
  if (!memory) return [];

  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      update_type,
      field_path,
      old_value,
      new_value,
      source,
      updated_by,
      created_at
    FROM memory_updates
    WHERE memory_type = 'domain'
      AND memory_id = ${memory.id}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    id: row.id as string,
    updateType: row.update_type as string,
    fieldPath: row.field_path as string | null,
    oldValue: row.old_value,
    newValue: row.new_value,
    source: row.source as MemorySource,
    updatedBy: row.updated_by as number | null,
    createdAt: new Date(row.created_at as Date),
  }));
}

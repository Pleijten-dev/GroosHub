/**
 * Project Memory Store
 *
 * Handles project-specific memory with:
 * - Hard values: Structured project facts (BVO, GO, units, etc.)
 * - Soft context: Learned context with source tracking
 * - Multi-source learning: Chats, documents, location analyses, LCA
 */

import { getDbConnection } from '@/lib/db/connection';
import { nanoid } from 'nanoid';
import type {
  ProjectMemory,
  ProjectHardValues,
  ProjectSoftContext,
  MemorySource,
  MemoryUpdateType,
} from '../types/memory';

// ============================================
// Constants
// ============================================

/** Minimum confidence for soft context to be included in prompts */
const MIN_CONTEXT_CONFIDENCE = 0.4;

/** Maximum token estimate for project memory */
const MAX_TOKEN_ESTIMATE = 800;

/** Starting confidence for new soft context */
const NEW_CONTEXT_CONFIDENCE = 0.5;

// ============================================
// Database Operations
// ============================================

/**
 * Get project memory
 */
export async function getProjectMemory(projectId: string): Promise<ProjectMemory | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      project_id,
      hard_values,
      soft_context,
      memory_content,
      project_summary,
      synthesis_sources,
      token_count,
      last_synthesized_at,
      created_at,
      updated_at
    FROM project_memories
    WHERE project_id = ${projectId}
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  // Parse soft_context JSONB
  const softContextRaw = (row.soft_context as ProjectSoftContext[]) || [];
  const softContext = softContextRaw.map(c => ({
    ...c,
    learnedAt: new Date(c.learnedAt),
  }));

  return {
    projectId: row.project_id as string,
    hardValues: (row.hard_values as ProjectHardValues) || {},
    softContext,
    memoryContent: (row.memory_content as string) || '',
    projectSummary: row.project_summary as string | undefined,
    tokenEstimate: (row.token_count as number) || 0,
    synthesisSources: (row.synthesis_sources as ProjectMemory['synthesisSources']) || [],
    lastSynthesizedAt: row.last_synthesized_at ? new Date(row.last_synthesized_at as Date) : null,
    createdAt: new Date(row.created_at as Date),
    updatedAt: new Date(row.updated_at as Date),
  };
}

/**
 * Get or create project memory
 */
export async function getOrCreateProjectMemory(projectId: string): Promise<ProjectMemory> {
  const existing = await getProjectMemory(projectId);
  if (existing) return existing;

  // Create new empty memory
  const memory: ProjectMemory = {
    projectId,
    hardValues: {},
    softContext: [],
    memoryContent: '',
    tokenEstimate: 0,
    synthesisSources: [],
    lastSynthesizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await saveProjectMemory(memory);
  return memory;
}

/**
 * Save project memory to database
 */
async function saveProjectMemory(memory: ProjectMemory): Promise<void> {
  const db = getDbConnection();

  // Calculate token estimate
  const tokenEstimate = estimateTokens(memory);

  if (tokenEstimate > MAX_TOKEN_ESTIMATE) {
    console.warn(`[ProjectMemory] Memory for project ${memory.projectId} exceeds token limit (${tokenEstimate} > ${MAX_TOKEN_ESTIMATE})`);
  }

  await db`
    INSERT INTO project_memories (
      project_id,
      hard_values,
      soft_context,
      memory_content,
      project_summary,
      synthesis_sources,
      token_count,
      last_synthesized_at,
      created_at,
      updated_at
    ) VALUES (
      ${memory.projectId},
      ${JSON.stringify(memory.hardValues)},
      ${JSON.stringify(memory.softContext)},
      ${memory.memoryContent},
      ${memory.projectSummary || null},
      ${JSON.stringify(memory.synthesisSources)},
      ${tokenEstimate},
      ${memory.lastSynthesizedAt},
      NOW(),
      NOW()
    )
    ON CONFLICT (project_id) DO UPDATE
    SET
      hard_values = EXCLUDED.hard_values,
      soft_context = EXCLUDED.soft_context,
      memory_content = EXCLUDED.memory_content,
      project_summary = EXCLUDED.project_summary,
      synthesis_sources = EXCLUDED.synthesis_sources,
      token_count = EXCLUDED.token_count,
      last_synthesized_at = EXCLUDED.last_synthesized_at,
      updated_at = NOW()
  `;
}

// ============================================
// Hard Values Operations
// ============================================

/**
 * Update hard values (structured project facts)
 */
export async function updateHardValues(
  projectId: string,
  values: Partial<ProjectHardValues>,
  source: MemorySource,
  sourceRef?: string
): Promise<void> {
  const memory = await getOrCreateProjectMemory(projectId);

  const oldValues = { ...memory.hardValues };

  // Merge new values (overwrite existing)
  memory.hardValues = {
    ...memory.hardValues,
    ...values,
  };

  // Track source
  addSynthesisSource(memory, source, sourceRef);

  await saveProjectMemory(memory);

  // Record changes
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== oldValues[key]) {
      await recordMemoryUpdate({
        memoryType: 'project',
        memoryId: projectId,
        updateType: oldValues[key] !== undefined ? 'learned' : 'learned',
        fieldPath: `hard_values.${key}`,
        oldValue: oldValues[key],
        newValue: value,
        source,
        sourceRef,
      });

      console.log(`[ProjectMemory] Updated hard value for ${projectId}: ${key} = ${JSON.stringify(value)}`);
    }
  }
}

/**
 * Get a specific hard value
 */
export async function getHardValue<K extends keyof ProjectHardValues>(
  projectId: string,
  key: K
): Promise<ProjectHardValues[K] | undefined> {
  const memory = await getProjectMemory(projectId);
  return memory?.hardValues[key];
}

/**
 * Remove a hard value
 */
export async function removeHardValue(
  projectId: string,
  key: keyof ProjectHardValues
): Promise<void> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return;

  const oldValue = memory.hardValues[key];
  delete memory.hardValues[key];

  await saveProjectMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'project',
    memoryId: projectId,
    updateType: 'user_delete',
    fieldPath: `hard_values.${key}`,
    oldValue,
    newValue: null,
    source: 'manual',
  });

  console.log(`[ProjectMemory] Removed hard value ${key} from ${projectId}`);
}

// ============================================
// Soft Context Operations
// ============================================

/**
 * Add or update soft context
 */
export async function addSoftContext(
  projectId: string,
  category: string,
  content: string,
  source: MemorySource,
  sourceRef?: string
): Promise<ProjectSoftContext> {
  const memory = await getOrCreateProjectMemory(projectId);

  // Check if similar context exists
  const existingIndex = memory.softContext.findIndex(
    c => c.category === category && c.content.toLowerCase() === content.toLowerCase()
  );

  if (existingIndex >= 0) {
    // Reinforce existing context
    const existing = memory.softContext[existingIndex];
    existing.confidence = Math.min(0.95, existing.confidence + 0.1);

    console.log(`[ProjectMemory] Reinforced soft context for ${projectId}: ${category}`);

    await saveProjectMemory(memory);
    return existing;
  }

  // Add new context
  const newContext: ProjectSoftContext = {
    id: nanoid(),
    category,
    content,
    source,
    sourceRef,
    confidence: NEW_CONTEXT_CONFIDENCE,
    learnedAt: new Date(),
  };

  memory.softContext.push(newContext);
  addSynthesisSource(memory, source, sourceRef);

  await saveProjectMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'project',
    memoryId: projectId,
    updateType: 'learned',
    fieldPath: `soft_context`,
    oldValue: null,
    newValue: { category, content },
    source,
    sourceRef,
  });

  console.log(`[ProjectMemory] Added soft context for ${projectId}: ${category} = "${content}"`);

  return newContext;
}

/**
 * Remove soft context by ID
 */
export async function removeSoftContext(
  projectId: string,
  contextId: string
): Promise<boolean> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return false;

  const index = memory.softContext.findIndex(c => c.id === contextId);
  if (index === -1) return false;

  const removed = memory.softContext.splice(index, 1)[0];

  await saveProjectMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'project',
    memoryId: projectId,
    updateType: 'user_delete',
    fieldPath: `soft_context`,
    oldValue: { category: removed.category, content: removed.content },
    newValue: null,
    source: 'manual',
  });

  console.log(`[ProjectMemory] Removed soft context ${removed.category} from ${projectId}`);
  return true;
}

/**
 * Update soft context content
 */
export async function updateSoftContext(
  projectId: string,
  contextId: string,
  newContent: string
): Promise<ProjectSoftContext | null> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return null;

  const context = memory.softContext.find(c => c.id === contextId);
  if (!context) return null;

  const oldContent = context.content;
  context.content = newContent;
  context.confidence = 0.8; // Manual edit gets high confidence
  context.source = 'manual';
  context.learnedAt = new Date();

  await saveProjectMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'project',
    memoryId: projectId,
    updateType: 'user_edit',
    fieldPath: `soft_context`,
    oldValue: { category: context.category, content: oldContent },
    newValue: { category: context.category, content: newContent },
    source: 'manual',
  });

  console.log(`[ProjectMemory] Updated soft context ${context.category} in ${projectId}`);
  return context;
}

// ============================================
// Summary Operations
// ============================================

/**
 * Update project summary
 */
export async function updateProjectSummary(
  projectId: string,
  summary: string
): Promise<void> {
  const memory = await getOrCreateProjectMemory(projectId);

  memory.projectSummary = summary;
  memory.lastSynthesizedAt = new Date();

  await saveProjectMemory(memory);

  console.log(`[ProjectMemory] Updated summary for ${projectId}`);
}

// ============================================
// Formatting for Prompts
// ============================================

/**
 * Format project memory for system prompt injection
 */
export function formatProjectMemoryForPrompt(memory: ProjectMemory): string {
  const parts: string[] = [];

  // Hard values
  const hardValueLines: string[] = [];
  const hv = memory.hardValues;

  if (hv.bvo) hardValueLines.push(`BVO: ${hv.bvo} m\u00B2`);
  if (hv.go) hardValueLines.push(`GO: ${hv.go} m\u00B2`);
  if (hv.units) hardValueLines.push(`Units: ${hv.units}`);
  if (hv.targetGroups?.length) hardValueLines.push(`Target groups: ${hv.targetGroups.join(', ')}`);
  if (hv.phase) hardValueLines.push(`Phase: ${hv.phase}`);
  if (hv.location?.address) hardValueLines.push(`Location: ${hv.location.address}`);
  if (hv.mpgTarget) hardValueLines.push(`MPG target: ${hv.mpgTarget} EUR/m\u00B2/year`);
  if (hv.budget) hardValueLines.push(`Budget: \u20AC${hv.budget.toLocaleString()}`);
  if (hv.buildingType) hardValueLines.push(`Building type: ${hv.buildingType}`);

  if (hardValueLines.length > 0) {
    parts.push(`Project facts:\n${hardValueLines.map(l => `- ${l}`).join('\n')}`);
  }

  // Soft context (only confident ones)
  const confidentContext = memory.softContext
    .filter(c => c.confidence >= MIN_CONTEXT_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence);

  if (confidentContext.length > 0) {
    const contextLines = confidentContext.map(c => `- ${c.category}: ${c.content}`);
    parts.push(`Project context:\n${contextLines.join('\n')}`);
  }

  // Project summary
  if (memory.projectSummary) {
    parts.push(`Summary: ${memory.projectSummary}`);
  }

  return parts.join('\n\n');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Estimate token count
 */
function estimateTokens(memory: ProjectMemory): number {
  const formatted = formatProjectMemoryForPrompt(memory);
  return Math.ceil(formatted.length / 4);
}

/**
 * Add a synthesis source
 */
function addSynthesisSource(
  memory: ProjectMemory,
  type: MemorySource,
  ref?: string
): void {
  if (!ref) return;

  // Check if already tracked
  const exists = memory.synthesisSources.some(
    s => s.type === type && s.ref === ref
  );

  if (!exists) {
    memory.synthesisSources.push({
      type,
      ref,
      contributedAt: new Date(),
    });

    // Keep only last 50 sources
    if (memory.synthesisSources.length > 50) {
      memory.synthesisSources = memory.synthesisSources.slice(-50);
    }
  }
}

/**
 * Record a memory update
 */
async function recordMemoryUpdate(params: {
  memoryType: 'personal' | 'project' | 'domain';
  memoryId: string;
  updateType: MemoryUpdateType;
  fieldPath?: string;
  oldValue: unknown;
  newValue: unknown;
  source: MemorySource;
  sourceRef?: string;
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
        created_at
      ) VALUES (
        ${params.memoryType},
        ${params.memoryId},
        ${params.updateType},
        ${params.fieldPath || null},
        ${params.oldValue ? JSON.stringify(params.oldValue) : null},
        ${params.newValue ? JSON.stringify(params.newValue) : null},
        ${params.source},
        ${params.sourceRef || null},
        NOW()
      )
    `;
  } catch (error) {
    console.error('[ProjectMemory] Failed to record memory update:', error);
  }
}

/**
 * Get memory update history for a project
 */
export async function getProjectMemoryHistory(
  projectId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  updateType: MemoryUpdateType;
  fieldPath: string | null;
  oldValue: unknown;
  newValue: unknown;
  source: MemorySource;
  createdAt: Date;
}>> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      update_type,
      field_path,
      old_value,
      new_value,
      source,
      created_at
    FROM memory_updates
    WHERE memory_type = 'project'
      AND memory_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    id: row.id as string,
    updateType: row.update_type as MemoryUpdateType,
    fieldPath: row.field_path as string | null,
    oldValue: row.old_value,
    newValue: row.new_value,
    source: row.source as MemorySource,
    createdAt: new Date(row.created_at as Date),
  }));
}

/**
 * Clear project memory
 */
export async function clearProjectMemory(projectId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM project_memories
    WHERE project_id = ${projectId}
  `;

  console.log(`[ProjectMemory] Cleared memory for project ${projectId}`);
}

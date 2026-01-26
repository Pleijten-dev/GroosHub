/**
 * Enhanced Personal Memory Store
 *
 * Handles user-specific memory with confidence-based preference tracking.
 * Key features:
 * - Confidence scoring prevents quick overwrites
 * - Reinforcement counting tracks pattern strength
 * - Explicit corrections override learned preferences
 * - Context-specific requests don't affect general preferences
 */

import { getDbConnection } from '@/lib/db/connection';
import { nanoid } from 'nanoid';
import type {
  PersonalMemory,
  UserIdentity,
  LearnedPreference,
  UpdatePreferenceParams,
  PreferenceUpdateResult,
  MemorySource,
  MemoryUpdateType,
} from '../types/memory';

// ============================================
// Constants
// ============================================

/** Minimum confidence to consider a preference "established" */
const ESTABLISHED_CONFIDENCE_THRESHOLD = 0.7;

/** Minimum reinforcements before a preference can be considered for contradiction */
const MIN_REINFORCEMENTS_FOR_CONTRADICTION = 3;

/** Number of sustained contradictions needed to trigger preference review */
const CONTRADICTION_THRESHOLD_FOR_REVIEW = 3;

/** Starting confidence for new preferences */
const NEW_PREFERENCE_CONFIDENCE = 0.3;

/** Confidence boost for explicit statements ("I prefer X") */
const EXPLICIT_PREFERENCE_CONFIDENCE = 0.5;

/** Maximum token estimate for personal memory */
const MAX_TOKEN_ESTIMATE = 600;

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate confidence from reinforcements and contradictions
 * Formula: reinforcements / (reinforcements + contradictions + 1)
 *
 * Examples:
 * - New (0, 0): 0 / 1 = 0.00
 * - After 1 reinforcement: 1 / 2 = 0.50
 * - After 5 reinforcements: 5 / 6 = 0.83
 * - After 25 reinforcements: 25 / 26 = 0.96
 * - 25 reinforcements, 1 contradiction: 25 / 27 = 0.93
 * - 25 reinforcements, 5 contradictions: 25 / 31 = 0.81
 */
export function calculateConfidence(
  reinforcements: number,
  contradictions: number
): number {
  return reinforcements / (reinforcements + contradictions + 1);
}

// ============================================
// Database Operations
// ============================================

/**
 * Get personal memory for a user
 */
export async function getPersonalMemory(userId: number): Promise<PersonalMemory> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      user_id,
      identity,
      memory_content,
      preferences_v2,
      token_count,
      last_analysis_at,
      created_at,
      updated_at
    FROM user_memories
    WHERE user_id = ${userId}
  `;

  if (result.length === 0) {
    // Return empty memory structure
    return {
      userId,
      identity: {},
      memoryContent: '',
      preferences: [],
      tokenEstimate: 0,
      lastSynthesizedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const row = result[0];

  // Parse preferences_v2 JSONB
  const preferencesRaw = (row.preferences_v2 as LearnedPreference[]) || [];
  const preferences = preferencesRaw.map(p => ({
    ...p,
    learnedAt: new Date(p.learnedAt),
    lastReinforcedAt: p.lastReinforcedAt ? new Date(p.lastReinforcedAt) : undefined,
  }));

  return {
    userId: row.user_id as number,
    identity: (row.identity as UserIdentity) || {},
    memoryContent: (row.memory_content as string) || '',
    preferences,
    tokenEstimate: (row.token_count as number) || 0,
    lastSynthesizedAt: row.last_analysis_at ? new Date(row.last_analysis_at as Date) : null,
    createdAt: new Date(row.created_at as Date),
    updatedAt: new Date(row.updated_at as Date),
  };
}

/**
 * Update or create a learned preference
 *
 * This is the core of the confidence system:
 * 1. If preference doesn't exist: create with initial confidence
 * 2. If same value: reinforce (increase confidence)
 * 3. If different value: handle as potential contradiction
 */
export async function updatePreference(
  params: UpdatePreferenceParams
): Promise<PreferenceUpdateResult> {
  const { userId, key, value, source, sourceRef, sourceText, isExplicit } = params;

  // Get current memory
  const memory = await getPersonalMemory(userId);

  // Find existing preference with this key
  const existingIndex = memory.preferences.findIndex(p => p.key === key);
  const existing = existingIndex >= 0 ? memory.preferences[existingIndex] : null;

  let result: PreferenceUpdateResult;
  let updateType: MemoryUpdateType;

  if (!existing) {
    // New preference
    const newPreference: LearnedPreference = {
      id: nanoid(),
      key,
      value,
      confidence: isExplicit ? EXPLICIT_PREFERENCE_CONFIDENCE : NEW_PREFERENCE_CONFIDENCE,
      reinforcements: isExplicit ? 2 : 1, // Explicit statements count as 2 reinforcements
      contradictions: 0,
      learnedFrom: source,
      learnedFromText: sourceText,
      learnedAt: new Date(),
    };

    memory.preferences.push(newPreference);
    result = { action: 'created', preference: newPreference };
    updateType = 'learned';

    console.log(`[PersonalMemory] Created preference for user ${userId}: ${key} = "${value}" (confidence: ${newPreference.confidence.toFixed(2)})`);

  } else if (existing.value === value) {
    // Same value - reinforce
    existing.reinforcements += 1;
    existing.confidence = calculateConfidence(existing.reinforcements, existing.contradictions);
    existing.lastReinforcedAt = new Date();

    result = {
      action: 'reinforced',
      preference: existing,
      previousConfidence: calculateConfidence(existing.reinforcements - 1, existing.contradictions),
    };
    updateType = 'reinforced';

    console.log(`[PersonalMemory] Reinforced preference for user ${userId}: ${key} = "${value}" (confidence: ${existing.confidence.toFixed(2)}, reinforcements: ${existing.reinforcements})`);

  } else {
    // Different value - handle contradiction
    result = await handleContradiction(memory, existingIndex, value, source, sourceText, isExplicit);
    updateType = result.action === 'updated' ? 'learned' : 'contradicted';
  }

  // Save updated memory
  await savePersonalMemory(memory);

  // Record the update
  await recordMemoryUpdate({
    memoryType: 'personal',
    memoryId: String(userId),
    updateType,
    preferenceKey: key,
    oldValue: existing ? { value: existing.value, confidence: existing.confidence } : null,
    newValue: { value: result.preference.value, confidence: result.preference.confidence },
    oldConfidence: existing?.confidence,
    newConfidence: result.preference.confidence,
    source,
    sourceRef,
    sourceText,
    updatedBy: userId,
  });

  return result;
}

/**
 * Handle a contradicting value for an existing preference
 */
async function handleContradiction(
  memory: PersonalMemory,
  existingIndex: number,
  newValue: string,
  source: MemorySource,
  sourceText: string | undefined,
  isExplicit: boolean | undefined
): Promise<PreferenceUpdateResult> {
  const existing = memory.preferences[existingIndex];
  const previousValue = existing.value;
  const previousConfidence = existing.confidence;

  // Case 1: Explicit correction always wins
  // User said "I actually prefer X" or similar
  if (isExplicit) {
    console.log(`[PersonalMemory] Explicit correction for ${existing.key}: "${existing.value}" -> "${newValue}"`);

    // Create new preference, mark old as having a contradiction
    existing.contradictions += 1;
    existing.confidence = calculateConfidence(existing.reinforcements, existing.contradictions);

    // If the old preference is now low confidence, replace it
    if (existing.confidence < 0.5 || existing.reinforcements < MIN_REINFORCEMENTS_FOR_CONTRADICTION) {
      existing.value = newValue;
      existing.reinforcements = 2; // Explicit starts with 2
      existing.contradictions = 0;
      existing.confidence = EXPLICIT_PREFERENCE_CONFIDENCE;
      existing.learnedFrom = source;
      existing.learnedFromText = sourceText;
      existing.learnedAt = new Date();
      existing.lastReinforcedAt = undefined;

      return {
        action: 'updated',
        preference: existing,
        previousValue,
        previousConfidence,
      };
    }

    // Otherwise, track the contradiction but don't update yet
    return {
      action: 'contradicted',
      preference: existing,
      previousValue,
      previousConfidence,
    };
  }

  // Case 2: Well-established preference (high confidence)
  // Single implicit contradiction doesn't change anything
  if (existing.confidence >= ESTABLISHED_CONFIDENCE_THRESHOLD) {
    existing.contradictions += 1;
    existing.confidence = calculateConfidence(existing.reinforcements, existing.contradictions);

    console.log(`[PersonalMemory] Contradiction noted for established preference ${existing.key} (confidence still ${existing.confidence.toFixed(2)})`);

    // Check if sustained contradictions should trigger review
    if (existing.contradictions >= CONTRADICTION_THRESHOLD_FOR_REVIEW) {
      console.log(`[PersonalMemory] Preference ${existing.key} has ${existing.contradictions} contradictions - may need review`);
      // In a full implementation, this could flag for user review
      // For now, we let confidence naturally decay
    }

    return {
      action: 'contradicted',
      preference: existing,
      previousValue,
      previousConfidence,
    };
  }

  // Case 3: Weak preference (low confidence, few reinforcements)
  // More likely to be replaced
  if (existing.reinforcements < MIN_REINFORCEMENTS_FOR_CONTRADICTION) {
    console.log(`[PersonalMemory] Replacing weak preference ${existing.key}: "${existing.value}" -> "${newValue}"`);

    existing.value = newValue;
    existing.reinforcements = 1;
    existing.contradictions = 0;
    existing.confidence = NEW_PREFERENCE_CONFIDENCE;
    existing.learnedFrom = source;
    existing.learnedFromText = sourceText;
    existing.learnedAt = new Date();
    existing.lastReinforcedAt = undefined;

    return {
      action: 'updated',
      preference: existing,
      previousValue,
      previousConfidence,
    };
  }

  // Case 4: Medium confidence preference
  // Track contradiction, don't update
  existing.contradictions += 1;
  existing.confidence = calculateConfidence(existing.reinforcements, existing.contradictions);

  console.log(`[PersonalMemory] Contradiction noted for ${existing.key} (confidence now ${existing.confidence.toFixed(2)})`);

  return {
    action: 'contradicted',
    preference: existing,
    previousValue,
    previousConfidence,
  };
}

/**
 * Save personal memory to database
 */
async function savePersonalMemory(memory: PersonalMemory): Promise<void> {
  const db = getDbConnection();

  // Calculate token estimate
  const tokenEstimate = estimateTokens(memory);

  if (tokenEstimate > MAX_TOKEN_ESTIMATE) {
    console.warn(`[PersonalMemory] Memory for user ${memory.userId} exceeds token limit (${tokenEstimate} > ${MAX_TOKEN_ESTIMATE})`);
    // In a full implementation, could trigger consolidation
  }

  await db`
    INSERT INTO user_memories (
      user_id,
      identity,
      memory_content,
      preferences_v2,
      token_count,
      last_analysis_at,
      created_at,
      updated_at
    ) VALUES (
      ${memory.userId},
      ${JSON.stringify(memory.identity)},
      ${memory.memoryContent},
      ${JSON.stringify(memory.preferences)},
      ${tokenEstimate},
      ${memory.lastSynthesizedAt},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      identity = EXCLUDED.identity,
      memory_content = EXCLUDED.memory_content,
      preferences_v2 = EXCLUDED.preferences_v2,
      token_count = EXCLUDED.token_count,
      last_analysis_at = EXCLUDED.last_analysis_at,
      updated_at = NOW()
  `;
}

/**
 * Update user identity
 */
export async function updateIdentity(
  userId: number,
  identity: Partial<UserIdentity>
): Promise<void> {
  const memory = await getPersonalMemory(userId);

  memory.identity = {
    ...memory.identity,
    ...identity,
  };

  await savePersonalMemory(memory);

  console.log(`[PersonalMemory] Updated identity for user ${userId}:`, identity);
}

/**
 * Delete a specific preference
 */
export async function deletePreference(userId: number, preferenceId: string): Promise<boolean> {
  const memory = await getPersonalMemory(userId);

  const index = memory.preferences.findIndex(p => p.id === preferenceId);
  if (index === -1) return false;

  const deleted = memory.preferences.splice(index, 1)[0];
  await savePersonalMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'personal',
    memoryId: String(userId),
    updateType: 'user_delete',
    preferenceKey: deleted.key,
    oldValue: { value: deleted.value, confidence: deleted.confidence },
    newValue: null,
    source: 'manual',
    updatedBy: userId,
  });

  console.log(`[PersonalMemory] Deleted preference ${deleted.key} for user ${userId}`);
  return true;
}

/**
 * Manually edit a preference (user override)
 */
export async function editPreference(
  userId: number,
  preferenceId: string,
  newValue: string
): Promise<LearnedPreference | null> {
  const memory = await getPersonalMemory(userId);

  const preference = memory.preferences.find(p => p.id === preferenceId);
  if (!preference) return null;

  const oldValue = preference.value;
  const oldConfidence = preference.confidence;

  // Manual edit resets the preference with high confidence
  preference.value = newValue;
  preference.reinforcements = 5; // Start with established baseline
  preference.contradictions = 0;
  preference.confidence = calculateConfidence(5, 0); // 5/6 = 0.83
  preference.learnedFrom = 'manual';
  preference.learnedAt = new Date();

  await savePersonalMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'personal',
    memoryId: String(userId),
    updateType: 'user_edit',
    preferenceKey: preference.key,
    oldValue: { value: oldValue, confidence: oldConfidence },
    newValue: { value: newValue, confidence: preference.confidence },
    source: 'manual',
    updatedBy: userId,
  });

  console.log(`[PersonalMemory] User ${userId} manually edited ${preference.key}: "${oldValue}" -> "${newValue}"`);
  return preference;
}

/**
 * Add a new preference manually
 */
export async function addPreferenceManually(
  userId: number,
  key: string,
  value: string
): Promise<LearnedPreference> {
  const memory = await getPersonalMemory(userId);

  // Check if key already exists
  const existing = memory.preferences.find(p => p.key === key);
  if (existing) {
    // Update existing
    const result = await editPreference(userId, existing.id, value);
    return result!;
  }

  // Create new with established baseline
  const newPreference: LearnedPreference = {
    id: nanoid(),
    key,
    value,
    confidence: calculateConfidence(5, 0), // 5/6 = 0.83
    reinforcements: 5,
    contradictions: 0,
    learnedFrom: 'manual',
    learnedAt: new Date(),
  };

  memory.preferences.push(newPreference);
  await savePersonalMemory(memory);

  await recordMemoryUpdate({
    memoryType: 'personal',
    memoryId: String(userId),
    updateType: 'learned',
    preferenceKey: key,
    oldValue: null,
    newValue: { value, confidence: newPreference.confidence },
    source: 'manual',
    updatedBy: userId,
  });

  console.log(`[PersonalMemory] User ${userId} manually added preference: ${key} = "${value}"`);
  return newPreference;
}

/**
 * Clear all memory for a user (GDPR compliance)
 */
export async function clearPersonalMemory(userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM user_memories
    WHERE user_id = ${userId}
  `;

  console.log(`[PersonalMemory] Cleared all memory for user ${userId}`);
}

// ============================================
// Formatting for Prompts
// ============================================

/**
 * Format personal memory for system prompt injection
 */
export function formatPersonalMemoryForPrompt(memory: PersonalMemory): string {
  const parts: string[] = [];

  // Identity
  if (memory.identity.name || memory.identity.position) {
    const identityParts = [];
    if (memory.identity.name) identityParts.push(memory.identity.name);
    if (memory.identity.position) identityParts.push(`(${memory.identity.position})`);
    parts.push(`User: ${identityParts.join(' ')}`);
  }

  // Preferences (only include established ones)
  const establishedPreferences = memory.preferences
    .filter(p => p.confidence >= 0.5) // Only reasonably confident preferences
    .sort((a, b) => b.confidence - a.confidence); // Most confident first

  if (establishedPreferences.length > 0) {
    const prefLines = establishedPreferences.map(p => `- ${p.key}: ${p.value}`);
    parts.push(`Known preferences:\n${prefLines.join('\n')}`);
  }

  // Legacy memory content (if any)
  if (memory.memoryContent && memory.memoryContent.trim()) {
    parts.push(memory.memoryContent);
  }

  return parts.join('\n\n');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Estimate token count for memory
 */
function estimateTokens(memory: PersonalMemory): number {
  const formatted = formatPersonalMemoryForPrompt(memory);
  // Rough estimate: ~4 characters per token
  return Math.ceil(formatted.length / 4);
}

/**
 * Record a memory update in the history table
 */
async function recordMemoryUpdate(params: {
  memoryType: 'personal' | 'project' | 'domain';
  memoryId: string;
  updateType: MemoryUpdateType;
  preferenceKey?: string;
  oldValue: unknown;
  newValue: unknown;
  oldConfidence?: number;
  newConfidence?: number;
  source: MemorySource;
  sourceRef?: string;
  sourceText?: string;
  updatedBy?: number;
}): Promise<void> {
  const db = getDbConnection();

  try {
    await db`
      INSERT INTO memory_updates (
        memory_type,
        memory_id,
        update_type,
        preference_key,
        old_value,
        new_value,
        old_confidence,
        new_confidence,
        source,
        source_ref,
        source_text,
        updated_by,
        created_at
      ) VALUES (
        ${params.memoryType},
        ${params.memoryId},
        ${params.updateType},
        ${params.preferenceKey || null},
        ${params.oldValue ? JSON.stringify(params.oldValue) : null},
        ${params.newValue ? JSON.stringify(params.newValue) : null},
        ${params.oldConfidence || null},
        ${params.newConfidence || null},
        ${params.source},
        ${params.sourceRef || null},
        ${params.sourceText || null},
        ${params.updatedBy || null},
        NOW()
      )
    `;
  } catch (error) {
    // Don't fail the main operation if history recording fails
    console.error('[PersonalMemory] Failed to record memory update:', error);
  }
}

/**
 * Get memory update history
 */
export async function getMemoryUpdateHistory(
  userId: number,
  limit: number = 20
): Promise<Array<{
  id: string;
  updateType: MemoryUpdateType;
  preferenceKey: string | null;
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
      preference_key,
      old_value,
      new_value,
      source,
      created_at
    FROM memory_updates
    WHERE memory_type = 'personal'
      AND memory_id = ${String(userId)}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map(row => ({
    id: row.id as string,
    updateType: row.update_type as MemoryUpdateType,
    preferenceKey: row.preference_key as string | null,
    oldValue: row.old_value,
    newValue: row.new_value,
    source: row.source as MemorySource,
    createdAt: new Date(row.created_at as Date),
  }));
}

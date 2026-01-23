/**
 * Enhanced Memory System Types
 *
 * Three-tier memory system:
 * 1. Personal Memory - User preferences and patterns
 * 2. Project Memory - Project-specific context
 * 3. Domain Memory - Organization-wide knowledge
 *
 * Key features:
 * - Confidence scoring prevents quick overwrites
 * - Reinforcement counting tracks pattern strength
 * - Source tracking shows where knowledge came from
 */

// ============================================
// Confidence System Types
// ============================================

/**
 * Tracks confidence in a learned preference
 * Confidence = reinforcements / (reinforcements + contradictions + 1)
 */
export interface ConfidenceMetrics {
  /** Number of times this preference has been confirmed/reinforced */
  reinforcements: number;
  /** Number of times this preference has been contradicted */
  contradictions: number;
  /** Calculated confidence score (0-1) */
  confidence: number;
}

/**
 * Sources that can contribute to memory learning
 */
export type MemorySource =
  | 'chat'           // AI chat conversations
  | 'panel'          // AI panel interactions (quick actions)
  | 'document'       // Uploaded documents
  | 'location'       // Location analysis
  | 'lca'            // LCA calculations
  | 'task'           // Task management
  | 'manual'         // User manual edit
  | 'admin'          // Admin edit (domain memory)
  | 'system';        // System-generated

/**
 * Types of memory updates
 */
export type MemoryUpdateType =
  | 'learned'        // New information learned
  | 'reinforced'     // Existing preference reinforced
  | 'contradicted'   // Existing preference contradicted
  | 'user_edit'      // User manually edited
  | 'user_delete'    // User manually deleted
  | 'admin_edit'     // Admin edited (domain memory)
  | 'expired';       // Context expired and removed

// ============================================
// Personal Memory Types
// ============================================

/**
 * User identity information
 */
export interface UserIdentity {
  name?: string;
  position?: string;
  organization?: string;
}

/**
 * A learned preference with confidence tracking
 */
export interface LearnedPreference {
  /** Unique identifier for this preference */
  id: string;
  /** Category of preference: writing_style, format, language, etc. */
  key: string;
  /** The actual preference value */
  value: string;
  /** How confident we are in this preference (0-1) */
  confidence: number;
  /** How many times this was reinforced */
  reinforcements: number;
  /** How many times this was contradicted */
  contradictions: number;
  /** How this was learned */
  learnedFrom: MemorySource;
  /** The actual text/interaction that taught us this */
  learnedFromText?: string;
  /** When this was first learned */
  learnedAt: Date;
  /** When this was last reinforced */
  lastReinforcedAt?: Date;
}

/**
 * Enhanced personal memory structure
 */
export interface PersonalMemory {
  userId: number;

  /** Structured user identity */
  identity: UserIdentity;

  /** Legacy memory content (for backwards compatibility) */
  memoryContent: string;

  /** Learned preferences with confidence tracking */
  preferences: LearnedPreference[];

  /** Token estimate for prompt injection */
  tokenEstimate: number;

  /** When memory was last analyzed/synthesized */
  lastSynthesizedAt: Date | null;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parameters for updating a personal preference
 */
export interface UpdatePreferenceParams {
  userId: number;
  key: string;
  value: string;
  source: MemorySource;
  sourceRef?: string;
  sourceText?: string;
  /** If true, this is an explicit user statement ("I prefer X") */
  isExplicit?: boolean;
}

/**
 * Result of a preference update operation
 */
export interface PreferenceUpdateResult {
  action: 'created' | 'reinforced' | 'contradicted' | 'updated' | 'ignored';
  preference: LearnedPreference;
  previousValue?: string;
  previousConfidence?: number;
}

// ============================================
// Project Memory Types
// ============================================

/**
 * Hard values (structured project facts)
 */
export interface ProjectHardValues {
  /** Bruto vloeroppervlak (gross floor area) in m2 */
  bvo?: number;
  /** Gebruiksoppervlak (usable floor area) in m2 */
  go?: number;
  /** Number of units/apartments */
  units?: number;
  /** Target demographic groups */
  targetGroups?: string[];
  /** Current project phase */
  phase?: string;
  /** Project location */
  location?: {
    address: string;
    coordinates?: [number, number];
  };
  /** MPG sustainability target */
  mpgTarget?: number;
  /** Project budget */
  budget?: number;
  /** Building type */
  buildingType?: string;
  /** Any additional structured values */
  [key: string]: unknown;
}

/**
 * Soft context (learned, flexible)
 */
export interface ProjectSoftContext {
  /** Unique identifier */
  id: string;
  /** Category: client_preference, design_language, writing_style, etc. */
  category: string;
  /** The actual learned context */
  content: string;
  /** Where this came from */
  source: MemorySource;
  /** Reference to source (chat_id, doc_id, etc.) */
  sourceRef?: string;
  /** Confidence in this context (0-1) */
  confidence: number;
  /** When this was learned */
  learnedAt: Date;
}

/**
 * Project memory structure
 */
export interface ProjectMemory {
  projectId: string;

  /** Structured project facts */
  hardValues: ProjectHardValues;

  /** Learned context with source tracking */
  softContext: ProjectSoftContext[];

  /** Legacy memory content */
  memoryContent: string;

  /** Project summary (AI-generated) */
  projectSummary?: string;

  /** Token estimate for prompt injection */
  tokenEstimate: number;

  /** Sources that contributed to this memory */
  synthesisSources: Array<{
    type: MemorySource;
    ref: string;
    contributedAt: Date;
  }>;

  /** When memory was last synthesized */
  lastSynthesizedAt: Date | null;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Domain Memory Types
// ============================================

/**
 * Explicit knowledge (admin-entered)
 */
export interface DomainKnowledge {
  /** Unique identifier */
  id: string;
  /** Category: regulation, company_standard, supplier, best_practice */
  category: string;
  /** Title/label for this knowledge */
  title: string;
  /** The actual knowledge content */
  content: string;
  /** Who added this */
  addedBy: number;
  /** When this was added */
  addedAt: Date;
}

/**
 * Learned pattern (from cross-project analysis)
 */
export interface DomainPattern {
  /** Unique identifier */
  id: string;
  /** Description of the pattern */
  pattern: string;
  /** How this was learned/evidence */
  evidence: string;
  /** How many projects showed this pattern */
  projectCount: number;
  /** Confidence in this pattern (0-1) */
  confidence: number;
  /** When this was learned */
  learnedAt: Date;
}

/**
 * Domain memory structure (organization-wide)
 */
export interface DomainMemory {
  id: string;
  orgId: string;

  /** Admin-entered knowledge */
  explicitKnowledge: DomainKnowledge[];

  /** Patterns learned from cross-project analysis */
  learnedPatterns: DomainPattern[];

  /** Token estimate for prompt injection */
  tokenEstimate: number;

  /** When patterns were last analyzed */
  lastSynthesizedAt: Date | null;

  /** Who last updated this */
  lastUpdatedBy: number | null;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Memory Update History Types
// ============================================

/**
 * Record of a memory update
 */
export interface MemoryUpdate {
  id: string;
  memoryType: 'personal' | 'project' | 'domain';
  memoryId: string;

  updateType: MemoryUpdateType;
  fieldPath?: string;
  preferenceKey?: string;

  oldValue: unknown;
  newValue: unknown;

  oldConfidence?: number;
  newConfidence?: number;
  reinforcementDelta?: number;

  source: MemorySource;
  sourceRef?: string;
  sourceText?: string;

  updatedBy?: number;
  metadata: Record<string, unknown>;

  createdAt: Date;
}

// ============================================
// Memory Synthesis Types
// ============================================

/**
 * Trigger for memory synthesis
 */
export interface SynthesisTrigger {
  type: MemorySource;
  /** Minimum messages/interactions before synthesis */
  minInteractions?: number;
  /** Time since last synthesis in hours */
  timeSinceLastHours?: number;
  /** Trigger on significant events */
  significantEvent?: boolean;
}

/**
 * What the LLM extracts from interactions
 */
export interface ExtractedMemory {
  /** User preferences detected */
  preferences?: Array<{
    key: string;
    value: string;
    isExplicit: boolean;
    sourceText: string;
  }>;

  /** Project facts detected */
  hardValues?: Partial<ProjectHardValues>;

  /** Soft context detected */
  softContext?: Array<{
    category: string;
    content: string;
  }>;

  /** Whether this contradicts existing memory */
  contradictions?: Array<{
    key: string;
    existingValue: string;
    newValue: string;
    isExplicitCorrection: boolean;
  }>;
}

// ============================================
// AI Analytics Types
// ============================================

/**
 * AI feature being used
 */
export type AIFeature =
  | 'location'
  | 'project'
  | 'task'
  | 'lca'
  | 'chat';

/**
 * Entry point for AI interaction
 */
export type AIEntryPoint =
  | 'ai_button'
  | 'chat'
  | 'quick_action';

/**
 * Analytics event for AI usage
 */
export interface AIAnalyticsEvent {
  orgId?: string;
  userId?: number;
  projectId?: string;

  feature: AIFeature;
  action: string;

  entryPoint?: AIEntryPoint;
  buttonWasAnimated?: boolean;
  panelWasOpened?: boolean;

  suggestionShown?: boolean;
  suggestionAccepted?: boolean;
  itemsCreated?: number;

  responseTimeMs?: number;
  tokensUsed?: number;

  metadata?: Record<string, unknown>;
}

// ============================================
// Combined Memory Context (for prompts)
// ============================================

/**
 * Combined memory context for injecting into system prompts
 */
export interface CombinedMemoryContext {
  personal: PersonalMemory | null;
  project: ProjectMemory | null;
  domain: DomainMemory | null;

  /** Total estimated tokens */
  totalTokenEstimate: number;
}

/**
 * Formatted memory for system prompt injection
 */
export interface FormattedMemoryPrompt {
  /** The formatted text to inject into system prompt */
  text: string;
  /** Token estimate */
  tokenEstimate: number;
  /** Which memories contributed */
  sources: Array<'personal' | 'project' | 'domain'>;
}

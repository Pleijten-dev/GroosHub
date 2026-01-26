/**
 * AI Assistant Feature
 *
 * Provides contextual AI assistance across the GroosHub platform.
 *
 * Key exports:
 * - AIAssistantProvider: Context provider for pages
 * - useAIAssistant: Hook to control the AI assistant
 * - Memory stores: Personal, Project, Domain
 * - Memory injector: For system prompt enhancement
 */

// Components
export { AIButton } from './components/AIButton';
export { AIPanel } from './components/AIPanel';

// Hooks & Context
export {
  AIAssistantProvider,
  useAIAssistant,
  useAIAssistantOptional,
} from './hooks/useAIAssistant';

// Memory System
export {
  // Memory injector (main entry point)
  getMemoryPromptSection,
  enhancePromptWithMemory,
  getCombinedMemoryContext,
  shouldSynthesizeMemory,

  // Personal memory
  getPersonalMemory,
  updatePreference,
  updateIdentity,
  deletePreference,
  editPreference,
  addPreferenceManually,
  clearPersonalMemory,
  formatPersonalMemoryForPrompt,
  calculateConfidence,

  // Project memory
  getProjectMemory,
  getOrCreateProjectMemory,
  updateHardValues,
  getHardValue,
  removeHardValue,
  addSoftContext,
  removeSoftContext,
  updateSoftContext,
  updateProjectSummary,
  formatProjectMemoryForPrompt,
  clearProjectMemory,

  // Domain memory
  getDomainMemory,
  getOrCreateDomainMemory,
  addExplicitKnowledge,
  updateExplicitKnowledge,
  removeExplicitKnowledge,
  addLearnedPattern,
  removeLearnedPattern,
  formatDomainMemoryForPrompt,
} from './lib';

// Types
export type {
  // Memory types
  PersonalMemory,
  UserIdentity,
  LearnedPreference,
  ProjectMemory,
  ProjectHardValues,
  ProjectSoftContext,
  DomainMemory,
  DomainKnowledge,
  DomainPattern,
  MemorySource,
  MemoryUpdateType,
  CombinedMemoryContext,
  FormattedMemoryPrompt,
  ConfidenceMetrics,
  UpdatePreferenceParams,
  PreferenceUpdateResult,

  // Component types
  AIButtonProps,
  AIButtonAnimationState,
  AIPanelProps,
  AIPanelState,
  AIContextData,
  QuickAction,
  AIContextProviderValue,
  AIFeature,
  AnimationTrigger,
  AnimationTriggerState,
} from './types';

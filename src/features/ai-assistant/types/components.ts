/**
 * AI Assistant Component Types
 *
 * Types for the AI Button, Panel, and related UI components
 */

import type { AIFeature } from './memory';

// ============================================
// AI Button Types
// ============================================

/**
 * Animation state for the AI button
 */
export type AIButtonAnimationState =
  | 'idle'           // No animation, subtle appearance
  | 'pulse'          // Gentle pulse to draw attention
  | 'glow'           // Glowing border animation (AI has suggestions)
  | 'processing';    // Active processing indicator

/**
 * AI Button props
 */
export interface AIButtonProps {
  /** Current animation state */
  animationState?: AIButtonAnimationState;
  /** Whether the panel is currently open */
  isOpen?: boolean;
  /** Click handler to toggle panel */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the button at all */
  visible?: boolean;
}

// ============================================
// AI Panel Types
// ============================================

/**
 * Context for the current page/feature
 */
export interface AIContextData {
  /** Which feature page we're on */
  feature: AIFeature;

  /** Current view data (varies by feature) */
  currentView: {
    // Location page context
    location?: {
      address?: string;
      coordinates?: [number, number];
      visibleCategories?: string[];
      hasCompletedAnalysis?: boolean;
    };

    // Project page context
    project?: {
      projectId: string;
      projectName: string;
      hasOverdueTasks?: boolean;
      recentDocuments?: number;
    };

    // Task page context
    task?: {
      taskId?: string;
      projectId?: string;
      overdueCount?: number;
    };

    // LCA page context
    lca?: {
      projectId?: string;
      currentMpg?: number;
      mpgTarget?: number;
      isCompliant?: boolean;
    };
  };

  /** Recent user actions on this page */
  recentActions?: Array<{
    action: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;

  /** Project context (if in a project) */
  projectContext?: {
    projectId: string;
    projectName: string;
  };
}

/**
 * Quick action definition
 */
export interface QuickAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name or component */
  icon: string;
  /** Description shown on hover */
  description?: string;
  /** Handler when clicked */
  handler: () => void | Promise<void>;
  /** Whether this action is currently available */
  available?: boolean;
  /** Whether this is a primary/featured action */
  isPrimary?: boolean;
}

/**
 * AI Panel state
 */
export type AIPanelState =
  | 'collapsed'      // Panel is closed
  | 'expanded'       // Panel is open with quick actions
  | 'chat'           // User is in chat mode within panel
  | 'action';        // Executing a specific action (e.g., create tasks flow)

/**
 * AI Panel props
 */
export interface AIPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Handler to close the panel */
  onClose: () => void;
  /** Current context data from the page */
  context: AIContextData;
  /** Quick actions available for this context */
  quickActions: QuickAction[];
  /** Current panel state */
  state?: AIPanelState;
  /** Handler for state changes */
  onStateChange?: (state: AIPanelState) => void;
  /** Current feature for analytics */
  feature: AIFeature;
  /** Project ID if in project context */
  projectId?: string;
}

/**
 * AI Panel header props
 */
export interface AIPanelHeaderProps {
  /** Title to display */
  title: string;
  /** Subtitle (e.g., current location address) */
  subtitle?: string;
  /** Close handler */
  onClose: () => void;
  /** Back handler (for nested views) */
  onBack?: () => void;
  /** Whether to show back button */
  showBack?: boolean;
}

/**
 * AI Panel chat props (mini chat within panel)
 */
export interface AIPanelChatProps {
  /** Current context */
  context: AIContextData;
  /** Placeholder text for input */
  placeholder?: string;
  /** Handler when user sends a message */
  onSend: (message: string) => Promise<void>;
  /** Whether currently processing */
  isProcessing?: boolean;
  /** Recent messages in this panel session */
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

// ============================================
// Animation Trigger Types
// ============================================

/**
 * Condition that triggers button animation
 */
export interface AnimationTrigger {
  /** Feature this trigger applies to */
  feature: AIFeature;
  /** Condition type */
  type:
    | 'analysis_complete'    // Location/LCA analysis finished
    | 'overdue_tasks'        // Tasks are overdue
    | 'new_documents'        // New documents uploaded
    | 'project_inactive'     // Project hasn't been touched
    | 'mpg_exceeded'         // LCA exceeded limit
    | 'custom';              // Custom condition
  /** For custom, a function that returns true when should animate */
  condition?: () => boolean;
  /** Minimum time between triggers (ms) */
  cooldown?: number;
}

/**
 * Animation trigger state
 */
export interface AnimationTriggerState {
  /** Whether animation should be active */
  shouldAnimate: boolean;
  /** Reason for animation (shown in tooltip) */
  reason?: string;
  /** Suggested quick action to highlight */
  suggestedAction?: string;
  /** When this trigger was last fired */
  lastTriggeredAt?: Date;
}

// ============================================
// Memory Editor Types
// ============================================

/**
 * Memory editor mode
 */
export type MemoryEditorMode = 'view' | 'edit';

/**
 * Base memory editor props
 */
export interface BaseMemoryEditorProps {
  /** Whether the editor is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current mode */
  mode?: MemoryEditorMode;
  /** Handler for mode change */
  onModeChange?: (mode: MemoryEditorMode) => void;
}

/**
 * Personal memory editor props
 */
export interface PersonalMemoryEditorProps extends BaseMemoryEditorProps {
  /** User ID */
  userId: number;
  /** Handler when memory is updated */
  onUpdate?: () => void;
}

/**
 * Project memory editor props
 */
export interface ProjectMemoryEditorProps extends BaseMemoryEditorProps {
  /** Project ID */
  projectId: string;
  /** Whether user can edit (based on role) */
  canEdit?: boolean;
  /** Handler when memory is updated */
  onUpdate?: () => void;
}

/**
 * Domain memory editor props
 */
export interface DomainMemoryEditorProps extends BaseMemoryEditorProps {
  /** Organization ID */
  orgId: string;
  /** Whether user is admin */
  isAdmin: boolean;
  /** Handler when memory is updated */
  onUpdate?: () => void;
}

// ============================================
// Provider Types
// ============================================

/**
 * AI context provider value
 */
export interface AIContextProviderValue {
  /** Current context data */
  context: AIContextData;
  /** Update context data */
  setContext: (context: Partial<AIContextData>) => void;
  /** Register a recent action */
  registerAction: (action: string, data?: Record<string, unknown>) => void;

  /** Panel state */
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  /** Animation state */
  animationState: AIButtonAnimationState;
  setAnimationState: (state: AIButtonAnimationState) => void;
  triggerAnimation: (reason: string, suggestedAction?: string) => void;

  /** Quick actions for current context */
  quickActions: QuickAction[];
  registerQuickAction: (action: QuickAction) => void;
  unregisterQuickAction: (id: string) => void;

  /** Analytics */
  trackEvent: (action: string, metadata?: Record<string, unknown>) => void;
}

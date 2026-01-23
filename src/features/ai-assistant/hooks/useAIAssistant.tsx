'use client';

/**
 * AI Assistant Context & Hook
 *
 * Provides a unified way to:
 * - Control the AI button and panel state
 * - Register quick actions per page
 * - Trigger animations
 * - Track analytics
 *
 * Usage:
 * ```tsx
 * // In a page component
 * const { openPanel, registerQuickAction, triggerAnimation } = useAIAssistant();
 *
 * useEffect(() => {
 *   registerQuickAction({
 *     id: 'create-tasks',
 *     label: 'Create follow-up tasks',
 *     icon: 'tasks',
 *     handler: () => handleCreateTasks(),
 *   });
 * }, []);
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { AIButton } from '../components/AIButton';
import { AIPanel } from '../components/AIPanel';
import type {
  AIButtonAnimationState,
  AIContextData,
  QuickAction,
  AIContextProviderValue,
} from '../types/components';
import type { AIFeature } from '../types/memory';

// ============================================
// Context
// ============================================

const AIAssistantContext = createContext<AIContextProviderValue | null>(null);

// ============================================
// Default Quick Actions by Feature
// ============================================

function getDefaultQuickActions(
  feature: AIFeature,
  _context?: Partial<AIContextData>
): QuickAction[] {
  switch (feature) {
    case 'location':
      return [
        {
          id: 'create-tasks',
          label: 'Create follow-up tasks',
          icon: 'tasks',
          description: 'Generate tasks based on location analysis',
          handler: async () => {
            // This will be handled by the chat - sends a preset prompt
            console.log('[QuickAction] Create tasks triggered');
          },
          isPrimary: true,
        },
        {
          id: 'match-target-groups',
          label: 'Match target groups',
          icon: 'users',
          description: 'Find best target groups for this location',
          handler: async () => {
            console.log('[QuickAction] Match target groups triggered');
          },
        },
        {
          id: 'find-similar',
          label: 'Find similar locations',
          icon: 'search',
          description: 'Discover comparable locations',
          handler: async () => {
            console.log('[QuickAction] Find similar triggered');
          },
        },
        {
          id: 'generate-summary',
          label: 'Generate summary',
          icon: 'document',
          description: 'Create a brief location overview',
          handler: async () => {
            console.log('[QuickAction] Generate summary triggered');
          },
        },
      ];

    case 'project':
      return [
        {
          id: 'project-status',
          label: 'Summarize project status',
          icon: 'chart',
          description: 'Get an overview of project progress',
          handler: async () => {
            console.log('[QuickAction] Project status triggered');
          },
          isPrimary: true,
        },
        {
          id: 'overdue-tasks',
          label: 'Review overdue tasks',
          icon: 'alert',
          description: 'See tasks that need attention',
          handler: async () => {
            console.log('[QuickAction] Overdue tasks triggered');
          },
        },
      ];

    case 'lca':
      return [
        {
          id: 'optimize-mpg',
          label: 'Optimize MPG score',
          icon: 'target',
          description: 'Get suggestions to improve sustainability',
          handler: async () => {
            console.log('[QuickAction] Optimize MPG triggered');
          },
          isPrimary: true,
        },
        {
          id: 'compare-materials',
          label: 'Compare materials',
          icon: 'chart',
          description: 'Analyze material alternatives',
          handler: async () => {
            console.log('[QuickAction] Compare materials triggered');
          },
        },
      ];

    default:
      return [];
  }
}

// ============================================
// Provider Props
// ============================================

interface AIAssistantProviderProps {
  children: ReactNode;
  /** Which feature/page this is for */
  feature: AIFeature;
  /** Project ID if in project context */
  projectId?: string;
  /** Initial context data */
  initialContext?: Partial<AIContextData>;
  /** Whether to show the AI button */
  showButton?: boolean;
}

// ============================================
// Provider Component
// ============================================

export function AIAssistantProvider({
  children,
  feature,
  projectId,
  initialContext,
  showButton = true,
}: AIAssistantProviderProps) {
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Animation state
  const [animationState, setAnimationState] = useState<AIButtonAnimationState>('idle');
  const [animationReason, setAnimationReason] = useState<string | undefined>();

  // Context data
  const [context, setContextState] = useState<AIContextData>({
    feature,
    currentView: initialContext?.currentView || {},
    recentActions: initialContext?.recentActions || [],
    projectContext: projectId ? { projectId, projectName: '' } : undefined,
    ...initialContext,
  });

  // Quick actions registry
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Register default quick actions based on feature
  useEffect(() => {
    const defaultActions = getDefaultQuickActions(feature, initialContext);
    if (defaultActions.length > 0) {
      setQuickActions(defaultActions);
    }
  }, [feature]); // Only run on mount

  // Panel controls
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    setAnimationState('idle'); // Stop animation when opened
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (isPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [isPanelOpen, openPanel, closePanel]);

  // Context management
  const setContext = useCallback((newContext: Partial<AIContextData>) => {
    setContextState(prev => ({
      ...prev,
      ...newContext,
      currentView: {
        ...prev.currentView,
        ...newContext.currentView,
      },
    }));
  }, []);

  const registerAction = useCallback((action: string, data?: Record<string, unknown>) => {
    setContextState(prev => ({
      ...prev,
      recentActions: [
        ...(prev.recentActions || []).slice(-9), // Keep last 10 actions
        { action, timestamp: new Date(), data },
      ],
    }));
  }, []);

  // Animation control
  const triggerAnimation = useCallback((reason: string, suggestedAction?: string) => {
    setAnimationState('glow');
    setAnimationReason(reason);

    // Auto-reset after 10 seconds if not interacted with
    setTimeout(() => {
      setAnimationState(prev => prev === 'glow' ? 'pulse' : prev);
    }, 10000);

    setTimeout(() => {
      setAnimationState(prev => prev === 'pulse' ? 'idle' : prev);
    }, 20000);
  }, []);

  // Quick action management
  const registerQuickAction = useCallback((action: QuickAction) => {
    setQuickActions(prev => {
      // Replace if same ID exists
      const existing = prev.findIndex(a => a.id === action.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = action;
        return updated;
      }
      return [...prev, action];
    });
  }, []);

  const unregisterQuickAction = useCallback((id: string) => {
    setQuickActions(prev => prev.filter(a => a.id !== id));
  }, []);

  // Analytics tracking
  const trackEvent = useCallback(async (action: string, metadata?: Record<string, unknown>) => {
    // TODO: Implement actual analytics tracking
    console.log(`[AIAssistant] Track: ${feature}/${action}`, metadata);
  }, [feature]);

  // Memoized context value
  const value = useMemo<AIContextProviderValue>(() => ({
    context,
    setContext,
    registerAction,
    isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    animationState,
    setAnimationState,
    triggerAnimation,
    quickActions,
    registerQuickAction,
    unregisterQuickAction,
    trackEvent,
  }), [
    context,
    setContext,
    registerAction,
    isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    animationState,
    triggerAnimation,
    quickActions,
    registerQuickAction,
    unregisterQuickAction,
    trackEvent,
  ]);

  return (
    <AIAssistantContext.Provider value={value}>
      {children}

      {/* AI Button (floating, bottom-right) */}
      {showButton && (
        <AIButton
          animationState={animationState}
          isOpen={isPanelOpen}
          onClick={togglePanel}
          visible={true}
        />
      )}

      {/* AI Panel (slides from right) */}
      <AIPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        context={context}
        quickActions={quickActions}
        feature={feature}
        projectId={projectId}
      />
    </AIAssistantContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAIAssistant(): AIContextProviderValue {
  const context = useContext(AIAssistantContext);

  if (!context) {
    throw new Error(
      'useAIAssistant must be used within an AIAssistantProvider. ' +
      'Wrap your component with <AIAssistantProvider feature="...">.'
    );
  }

  return context;
}

// ============================================
// Conditional Hook (doesn't throw if not in provider)
// ============================================

export function useAIAssistantOptional(): AIContextProviderValue | null {
  return useContext(AIAssistantContext);
}

// ============================================
// Re-exports
// ============================================

export { AIButton } from '../components/AIButton';
export { AIPanel } from '../components/AIPanel';

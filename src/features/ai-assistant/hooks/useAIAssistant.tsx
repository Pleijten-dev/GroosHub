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
// Quick Actions by Location Tab
// ============================================

function getLocationQuickActionsByTab(activeTab?: string): QuickAction[] {
  switch (activeTab) {
    case 'doelgroepen':
      return [
        {
          id: 'explain-scenario',
          label: 'Explain current scenario',
          icon: 'cube',
          description: 'Why are these personas selected?',
          toolId: 'doelgroepen-explain-scenario',
          isPrimary: true,
        },
        {
          id: 'suggest-scenario',
          label: 'Suggest best scenario',
          icon: 'target',
          description: 'Recommend based on location data',
          toolId: 'doelgroepen-suggest-best',
        },
        {
          id: 'compare-scenarios',
          label: 'Compare all scenarios',
          icon: 'compare',
          description: 'Show tradeoffs between options',
          toolId: 'doelgroepen-compare',
        },
      ];

    case 'score':
      return [
        {
          id: 'explain-scores',
          label: 'Explain score breakdown',
          icon: 'chart',
          description: 'What influences each category?',
          toolId: 'score-explain-breakdown',
          isPrimary: true,
        },
        {
          id: 'improvement-tips',
          label: 'How to improve scores',
          icon: 'target',
          description: 'Actionable recommendations',
          toolId: 'score-improvement-tips',
        },
        {
          id: 'generate-summary',
          label: 'Generate executive summary',
          icon: 'summary',
          description: 'Create location overview',
          toolId: 'score-executive-summary',
        },
      ];

    case 'demografie':
      return [
        {
          id: 'demographic-profile',
          label: 'Summarize demographics',
          icon: 'users',
          description: 'Key population characteristics',
          toolId: 'demografie-population-profile',
          isPrimary: true,
        },
        {
          id: 'recommend-services',
          label: 'Recommend services',
          icon: 'building',
          description: 'What does this population need?',
          toolId: 'demografie-service-recommendations',
        },
        {
          id: 'scenario-comparison',
          label: 'Compare scenarios',
          icon: 'compare',
          description: 'Match demographics to personas',
          toolId: 'demografie-scenario-comparison',
        },
      ];

    case 'veiligheid':
      return [
        {
          id: 'safety-assessment',
          label: 'Safety risk assessment',
          icon: 'shield',
          description: 'Identify key safety concerns',
          toolId: 'veiligheid-safety-assessment',
          isPrimary: true,
        },
        {
          id: 'safety-improvements',
          label: 'Recommend improvements',
          icon: 'check',
          description: 'How to improve safety metrics',
          toolId: 'veiligheid-improvements',
        },
        {
          id: 'compare-safety',
          label: 'Compare to similar areas',
          icon: 'compare',
          description: 'Benchmark safety performance',
          toolId: 'veiligheid-benchmarking',
        },
      ];

    case 'gezondheid':
      return [
        {
          id: 'health-needs',
          label: 'Health needs assessment',
          icon: 'heart',
          description: 'Priority health concerns',
          toolId: 'gezondheid-health-needs',
          isPrimary: true,
        },
        {
          id: 'wellness-programs',
          label: 'Suggest wellness programs',
          icon: 'leaf',
          description: 'Programs for this community',
          toolId: 'gezondheid-wellness-programs',
        },
        {
          id: 'health-facilities',
          label: 'Prioritize health facilities',
          icon: 'building',
          description: 'What facilities are needed?',
          toolId: 'gezondheid-facility-priorities',
        },
      ];

    case 'leefbaarheid':
      return [
        {
          id: 'livability-analysis',
          label: 'Analyze livability factors',
          icon: 'home',
          description: 'What affects quality of life?',
          toolId: 'leefbaarheid-factors-analysis',
          isPrimary: true,
        },
        {
          id: 'community-plan',
          label: 'Create community plan',
          icon: 'users',
          description: 'Improve social cohesion',
          toolId: 'leefbaarheid-community-plan',
        },
        {
          id: 'facility-improvements',
          label: 'Facility improvements',
          icon: 'building',
          description: 'Which facilities need attention?',
          toolId: 'leefbaarheid-facility-improvements',
        },
      ];

    case 'voorzieningen':
      return [
        {
          id: 'amenity-gaps',
          label: 'Find missing amenities',
          icon: 'search',
          description: 'What is this area lacking?',
          toolId: 'voorzieningen-amenity-gaps',
          isAgentic: true,
          isPrimary: true,
        },
        {
          id: 'recommend-amenities',
          label: 'Recommend new amenities',
          icon: 'building',
          description: 'What should be added?',
          toolId: 'voorzieningen-recommendations',
          isAgentic: true,
        },
        {
          id: 'local-guide',
          label: 'Generate local guide',
          icon: 'map',
          description: 'Resident-friendly overview',
          toolId: 'voorzieningen-local-guide',
          isAgentic: true,
        },
      ];

    case 'woningmarkt':
      return [
        {
          id: 'market-analysis',
          label: 'Housing market analysis',
          icon: 'chart',
          description: 'Key market insights',
          toolId: 'woningmarkt-market-analysis',
          isPrimary: true,
        },
        {
          id: 'investment-recommendation',
          label: 'Investment recommendation',
          icon: 'money',
          description: 'Is this a good investment?',
          toolId: 'woningmarkt-investment-advice',
        },
        {
          id: 'housing-demand',
          label: 'Analyze housing demand',
          icon: 'home',
          description: 'What types are in demand?',
          toolId: 'woningmarkt-demand-analysis',
        },
      ];

    case 'kaarten':
      return [
        {
          id: 'site-analysis',
          label: 'Site constraints analysis',
          icon: 'map',
          description: 'Regulatory & environmental limits',
          toolId: 'kaarten-site-constraints',
          isPrimary: true,
        },
        {
          id: 'risk-assessment',
          label: 'Environmental risk assessment',
          icon: 'risk',
          description: 'Flooding, noise, and more',
          toolId: 'kaarten-environmental-risks',
        },
        {
          id: 'development-strategy',
          label: 'Development strategy',
          icon: 'building',
          description: 'Recommendations based on layers',
          toolId: 'kaarten-development-strategy',
        },
      ];

    case 'pve':
      return [
        {
          id: 'recommend-pve',
          label: 'Recommend program mix',
          icon: 'target',
          description: 'Best allocation for this location',
          toolId: 'pve-program-mix',
          isPrimary: true,
        },
        {
          id: 'generate-specifications',
          label: 'Generate specifications',
          icon: 'document',
          description: 'Detailed unit requirements',
          toolId: 'pve-specifications',
        },
        {
          id: 'compare-pve',
          label: 'Compare PVE scenarios',
          icon: 'compare',
          description: 'Cost & viability analysis',
          toolId: 'pve-scenario-comparison',
        },
      ];

    case 'genereer-rapport':
      return [
        {
          id: 'full-report',
          label: 'Generate full report',
          icon: 'document',
          description: 'Complete development proposal',
          toolId: 'rapport-full-report',
          available: false, // Disabled - not yet implemented
          isPrimary: true,
        },
        {
          id: 'executive-summary',
          label: 'Create executive summary',
          icon: 'summary',
          description: 'One-page overview',
          toolId: 'rapport-executive-summary',
          available: false, // Disabled - not yet implemented
        },
        {
          id: 'investor-pitch',
          label: 'Create investor pitch',
          icon: 'money',
          description: 'Investment-ready summary',
          toolId: 'rapport-investor-pitch',
          available: false, // Disabled - not yet implemented
        },
      ];

    default:
      // Default location actions when no specific tab
      return [
        {
          id: 'location-summary',
          label: 'Summarize location',
          icon: 'location',
          description: 'Quick overview of this location',
          toolId: 'score-executive-summary', // Use SWOT as default summary
          isPrimary: true,
        },
        {
          id: 'explain-scores',
          label: 'Explain scores',
          icon: 'chart',
          description: 'Understand score breakdown',
          toolId: 'score-explain-breakdown',
        },
      ];
  }
}

// ============================================
// Default Quick Actions by Feature
// ============================================

function getDefaultQuickActions(
  feature: AIFeature,
  context?: Partial<AIContextData>
): QuickAction[] {
  switch (feature) {
    case 'location':
      // Use tab-specific actions for location
      return getLocationQuickActionsByTab(context?.currentView?.location?.activeTab);

    case 'project':
      return [
        {
          id: 'project-status',
          label: 'Summarize project status',
          icon: 'chart',
          description: 'Get an overview of project progress',
          prompt: 'Summarize the current status of this project. Include progress on key milestones, task completion rates, upcoming deadlines, and any blockers or risks that need attention.',
          isPrimary: true,
        },
        {
          id: 'overdue-tasks',
          label: 'Review overdue tasks',
          icon: 'alert',
          description: 'See tasks that need attention',
          prompt: 'List all overdue tasks for this project. For each task, indicate how overdue it is, who is responsible, and suggest priorities for addressing the backlog.',
        },
      ];

    case 'lca':
      return [
        {
          id: 'optimize-mpg',
          label: 'Optimize MPG score',
          icon: 'target',
          description: 'Get suggestions to improve sustainability',
          prompt: 'Analyze the current LCA results and suggest ways to optimize the MPG (Milieu Prestatie Gebouwen) score. What material substitutions or design changes would have the biggest impact on sustainability?',
          isPrimary: true,
        },
        {
          id: 'compare-materials',
          label: 'Compare materials',
          icon: 'chart',
          description: 'Analyze material alternatives',
          prompt: 'Compare the environmental impact of different material options. Create a comparison showing embodied carbon, recyclability, and MPG impact for alternative materials that could be used in this project.',
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
  const [previousTab, setPreviousTab] = useState<string | undefined>(undefined);

  // Get current active tab from context
  const currentTab = context.currentView?.location?.activeTab;

  // Register/update quick actions based on feature and context (including active tab)
  useEffect(() => {
    const defaultActions = getDefaultQuickActions(feature, context);
    if (defaultActions.length > 0) {
      setQuickActions(defaultActions);
    }

    // Trigger animation when tab changes (but not on initial mount)
    if (previousTab !== undefined && previousTab !== currentTab && currentTab !== undefined) {
      // New tab = new suggestions, trigger glow animation
      setAnimationState('glow');

      // Auto-reset animation after delay
      const timer = setTimeout(() => {
        setAnimationState('idle');
      }, 5000);

      return () => clearTimeout(timer);
    }

    setPreviousTab(currentTab);
  }, [feature, currentTab]); // Re-run when feature or tab changes

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

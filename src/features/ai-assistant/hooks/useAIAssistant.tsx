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
          prompt: 'Based on the current location data and demographics, explain why the selected target group scenario (doelgroepen) makes sense. What characteristics of this area support this choice?',
          isPrimary: true,
        },
        {
          id: 'suggest-scenario',
          label: 'Suggest best scenario',
          icon: 'target',
          description: 'Recommend based on location data',
          prompt: 'Analyze this location and recommend the optimal target group scenario (doelgroepen). Consider the demographics, amenities, transport, and housing market data to suggest which personas would be the best fit for development here.',
        },
        {
          id: 'compare-scenarios',
          label: 'Compare all scenarios',
          icon: 'compare',
          description: 'Show tradeoffs between options',
          prompt: 'Compare the different target group scenarios available for this location. What are the pros and cons of each option? Create a comparison table showing viability, demand, and fit for each scenario.',
        },
      ];

    case 'score':
      return [
        {
          id: 'explain-scores',
          label: 'Explain score breakdown',
          icon: 'chart',
          description: 'What influences each category?',
          prompt: 'Explain the location scores in detail. For each category (demographics, safety, health, livability, amenities, housing), describe what factors contributed to the score and what the numbers mean for development potential.',
          isPrimary: true,
        },
        {
          id: 'improvement-tips',
          label: 'How to improve scores',
          icon: 'target',
          description: 'Actionable recommendations',
          prompt: 'Based on the current location scores, what are actionable recommendations to improve the weaker areas? Focus on practical steps that could enhance the development potential of this location.',
        },
        {
          id: 'generate-summary',
          label: 'Generate executive summary',
          icon: 'summary',
          description: 'Create location overview',
          prompt: 'Generate an executive summary for this location analysis. Include the key scores, notable strengths, areas of concern, and an overall assessment suitable for presenting to stakeholders.',
        },
      ];

    case 'demografie':
      return [
        {
          id: 'demographic-profile',
          label: 'Summarize demographics',
          icon: 'users',
          description: 'Key population characteristics',
          prompt: 'Summarize the demographic profile of this location. Include population composition, age distribution, household types, income levels, and any notable trends. What does this tell us about potential residents?',
          isPrimary: true,
        },
        {
          id: 'recommend-services',
          label: 'Recommend services',
          icon: 'building',
          description: 'What does this population need?',
          prompt: 'Based on the demographic data, what services and facilities would this population benefit from? Consider age groups, household types, and socioeconomic factors to recommend appropriate amenities for new development.',
        },
        {
          id: 'target-marketing',
          label: 'Create target messaging',
          icon: 'document',
          description: 'Marketing for this demographic',
          prompt: 'Create marketing messaging tailored to the demographic profile of this area. What value propositions would resonate with potential residents? Suggest key selling points and communication angles.',
        },
      ];

    case 'veiligheid':
      return [
        {
          id: 'safety-assessment',
          label: 'Safety risk assessment',
          icon: 'shield',
          description: 'Identify key safety concerns',
          prompt: 'Provide a comprehensive safety assessment for this location. Analyze crime statistics, incident types, and trends. What are the key safety concerns that should be addressed in the development?',
          isPrimary: true,
        },
        {
          id: 'safety-improvements',
          label: 'Recommend improvements',
          icon: 'check',
          description: 'How to improve safety metrics',
          prompt: 'Based on the safety data, recommend improvements that could enhance security for residents. Consider design features, lighting, community programs, and surveillance that could mitigate risks.',
        },
        {
          id: 'compare-safety',
          label: 'Compare to similar areas',
          icon: 'compare',
          description: 'Benchmark safety performance',
          prompt: 'Compare the safety metrics of this location to similar neighborhoods or the municipal average. How does this area perform relative to benchmarks? Are there areas where it excels or falls behind?',
        },
      ];

    case 'gezondheid':
      return [
        {
          id: 'health-needs',
          label: 'Health needs assessment',
          icon: 'heart',
          description: 'Priority health concerns',
          prompt: 'Analyze the health data for this location and identify priority health concerns. What health indicators stand out? What does this mean for the wellness needs of future residents?',
          isPrimary: true,
        },
        {
          id: 'wellness-programs',
          label: 'Suggest wellness programs',
          icon: 'leaf',
          description: 'Programs for this community',
          prompt: 'Based on the health profile, suggest wellness programs and initiatives that would benefit this community. Consider both preventive health measures and support services that address identified needs.',
        },
        {
          id: 'health-facilities',
          label: 'Prioritize health facilities',
          icon: 'building',
          description: 'What facilities are needed?',
          prompt: 'What health and medical facilities should be prioritized in or near this development? Consider the health data, demographics, and existing healthcare infrastructure to make recommendations.',
        },
      ];

    case 'leefbaarheid':
      return [
        {
          id: 'livability-analysis',
          label: 'Analyze livability factors',
          icon: 'home',
          description: 'What affects quality of life?',
          prompt: 'Analyze the livability factors for this location. What contributes positively to quality of life here? What detracts from it? Provide a comprehensive assessment of the living environment.',
          isPrimary: true,
        },
        {
          id: 'community-plan',
          label: 'Create community plan',
          icon: 'users',
          description: 'Improve social cohesion',
          prompt: 'Suggest a community development plan that would enhance social cohesion and livability. What shared spaces, community programs, and design features would foster a strong neighborhood identity?',
        },
        {
          id: 'facility-improvements',
          label: 'Facility improvements',
          icon: 'building',
          description: 'Which facilities need attention?',
          prompt: 'Based on the livability data, which public facilities and infrastructure need improvement? Prioritize areas that would have the greatest impact on resident satisfaction and quality of life.',
        },
      ];

    case 'voorzieningen':
      return [
        {
          id: 'amenity-gaps',
          label: 'Find missing amenities',
          icon: 'search',
          description: 'What is this area lacking?',
          prompt: 'Analyze the amenities data and identify gaps. What services and facilities are missing or underrepresented in this area? What would residents need that isn\'t currently available nearby?',
          isPrimary: true,
        },
        {
          id: 'recommend-amenities',
          label: 'Recommend new amenities',
          icon: 'building',
          description: 'What should be added?',
          prompt: 'Based on the demographics and current amenities, recommend specific new amenities that should be included in or near the development. Prioritize by impact and feasibility.',
        },
        {
          id: 'local-guide',
          label: 'Generate local guide',
          icon: 'map',
          description: 'Resident-friendly overview',
          prompt: 'Create a local amenities guide that could be shared with prospective residents. Highlight the best nearby shops, restaurants, parks, schools, and other facilities that make this area attractive.',
        },
      ];

    case 'woningmarkt':
      return [
        {
          id: 'market-analysis',
          label: 'Housing market analysis',
          icon: 'chart',
          description: 'Key market insights',
          prompt: 'Provide a comprehensive housing market analysis for this location. Include price trends, supply and demand dynamics, comparable developments, and market outlook. What do the numbers tell us?',
          isPrimary: true,
        },
        {
          id: 'investment-recommendation',
          label: 'Investment recommendation',
          icon: 'money',
          description: 'Is this a good investment?',
          prompt: 'Evaluate this location as an investment opportunity. Consider market conditions, price trends, rental yields, and growth potential. What is the investment thesis for developing here?',
        },
        {
          id: 'housing-demand',
          label: 'Analyze housing demand',
          icon: 'home',
          description: 'What types are in demand?',
          prompt: 'Analyze housing demand in this area. What unit types, sizes, and price points are most in demand? How should the unit mix be optimized to match market demand?',
        },
      ];

    case 'kaarten':
      return [
        {
          id: 'site-analysis',
          label: 'Site constraints analysis',
          icon: 'map',
          description: 'Regulatory & environmental limits',
          prompt: 'Analyze the site constraints visible in the map layers. What regulatory restrictions, zoning limitations, or environmental constraints affect development potential? Summarize key restrictions.',
          isPrimary: true,
        },
        {
          id: 'risk-assessment',
          label: 'Environmental risk assessment',
          icon: 'risk',
          description: 'Flooding, noise, and more',
          prompt: 'Conduct an environmental risk assessment based on the map data. Evaluate flood risk, noise levels, soil conditions, and other environmental factors. What mitigation measures might be needed?',
        },
        {
          id: 'development-strategy',
          label: 'Development strategy',
          icon: 'building',
          description: 'Recommendations based on layers',
          prompt: 'Based on the map analysis and all visible layers, recommend a development strategy. How should the site be utilized given the constraints and opportunities revealed by the spatial data?',
        },
      ];

    case 'pve':
      return [
        {
          id: 'recommend-pve',
          label: 'Recommend program mix',
          icon: 'target',
          description: 'Best allocation for this location',
          prompt: 'Recommend an optimal program of requirements (programma van eisen) for this location. Based on the demographics, market data, and location characteristics, suggest the ideal mix of unit types, sizes, and target prices.',
          isPrimary: true,
        },
        {
          id: 'generate-specifications',
          label: 'Generate specifications',
          icon: 'document',
          description: 'Detailed unit requirements',
          prompt: 'Generate detailed specifications for each unit type in the program. Include recommended floor areas, room counts, target prices, quality levels, and any special features that would appeal to the target demographic.',
        },
        {
          id: 'compare-pve',
          label: 'Compare PVE scenarios',
          icon: 'compare',
          description: 'Cost & viability analysis',
          prompt: 'Compare different program scenarios for this development. What are the trade-offs between maximizing unit count vs. unit size? How do different mixes affect total revenue and marketability?',
        },
      ];

    case 'genereer-rapport':
      return [
        {
          id: 'full-report',
          label: 'Generate full report',
          icon: 'document',
          description: 'Complete development proposal',
          prompt: 'Generate a comprehensive development feasibility report for this location. Include executive summary, location analysis, market assessment, recommended program, financial overview, and key risks and opportunities.',
          isPrimary: true,
        },
        {
          id: 'executive-summary',
          label: 'Create executive summary',
          icon: 'summary',
          description: 'One-page overview',
          prompt: 'Create a one-page executive summary suitable for decision makers. Summarize the key findings, opportunity assessment, and recommended next steps in a concise, compelling format.',
        },
        {
          id: 'investor-pitch',
          label: 'Create investor pitch',
          icon: 'money',
          description: 'Investment-ready summary',
          prompt: 'Create an investor pitch document for this development opportunity. Highlight the investment thesis, market opportunity, expected returns, and key differentiators that make this location attractive.',
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
          prompt: 'Provide a comprehensive summary of this location for urban development. Cover the key demographic, safety, health, livability, amenity, and housing market characteristics. What makes this location unique?',
          isPrimary: true,
        },
        {
          id: 'create-tasks',
          label: 'Create follow-up tasks',
          icon: 'tasks',
          description: 'Generate tasks from analysis',
          prompt: 'Based on the location analysis, generate a list of follow-up tasks and action items. What further research, site visits, or stakeholder consultations should be planned?',
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

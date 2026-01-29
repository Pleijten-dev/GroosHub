// src/shared/components/UI/NavigationBar/constants.ts
import { NavigationItem } from './types';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'ai-assistant',
    labelKey: 'nav.aiAssistant',
    href: '/ai-assistant',
  },
  {
    id: 'urban-analysis',
    labelKey: 'nav.urbanAnalysis',
    href: '/location',
  },
  {
    id: 'lca-calculator',
    labelKey: 'nav.lcaCalculator',
    href: '/lca',
    disabled: true,
  },
  {
    id: 'project-analysis',
    labelKey: 'nav.projectAnalysis',
    href: '/project-analysis',
    disabled: true,
  },
  {
    id: 'project-design',
    labelKey: 'nav.projectDesign',
    href: '/project-design',
    disabled: true,
  },
  {
    id: 'project-overview',
    labelKey: 'nav.projectOverview',
    href: '/project-overview',
    disabled: true,
  },
] as const;
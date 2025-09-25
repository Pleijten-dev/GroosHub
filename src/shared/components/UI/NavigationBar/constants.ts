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
    href: '/urban-analysis',
  },
  {
    id: 'project-analysis',
    labelKey: 'nav.projectAnalysis',
    href: '/project-analysis',
  },
  {
    id: 'project-design',
    labelKey: 'nav.projectDesign',
    href: '/project-design',
  },
  {
    id: 'project-overview',
    labelKey: 'nav.projectOverview',
    href: '/project-overview',
  },
] as const;
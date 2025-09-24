// src/shared/components/UI/NavigationBar/constants.ts
import { NavigationItem } from './types';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'ai-assistant',
    labelKey: 'nav.aiAssistant',
    href: '/ai-assistant',
    icon: '🤖',
  },
  {
    id: 'urban-analysis',
    labelKey: 'nav.urbanAnalysis',
    href: '/urban-analysis',
    icon: '🏙️',
  },
  {
    id: 'project-analysis',
    labelKey: 'nav.projectAnalysis',
    href: '/project-analysis',
    icon: '📊',
  },
  {
    id: 'project-design',
    labelKey: 'nav.projectDesign',
    href: '/project-design',
    icon: '✏️',
  },
  {
    id: 'project-overview',
    labelKey: 'nav.projectOverview',
    href: '/project-overview',
    icon: '📋',
  },
  {
    id: 'user',
    labelKey: 'nav.user',
    href: '/user',
    icon: '👤',
  },
] as const;
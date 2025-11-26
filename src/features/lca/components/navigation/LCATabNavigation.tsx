/**
 * LCA Tab Navigation Component
 *
 * Horizontal tab navigation for LCA section pages.
 * Shows tabs for Dashboard, Materialen, Templates, and Settings.
 *
 * Features:
 * - Active tab indicator with underline
 * - Responsive design
 * - Bilingual support
 * - Keyboard navigation
 *
 * @module features/lca/components/navigation
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LCATabNavigationProps {
  /** Current locale */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

export type LCATab = 'dashboard' | 'materials' | 'templates' | 'settings';

interface TabConfig {
  id: LCATab;
  label: {
    nl: string;
    en: string;
  };
  path: string;
  icon?: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const TABS: TabConfig[] = [
  {
    id: 'dashboard',
    label: {
      nl: 'Dashboard',
      en: 'Dashboard',
    },
    path: '/lca/dashboard',
  },
  {
    id: 'materials',
    label: {
      nl: 'Materialen',
      en: 'Materials',
    },
    path: '/lca/materials',
  },
  {
    id: 'templates',
    label: {
      nl: 'Sjablonen',
      en: 'Templates',
    },
    path: '/lca/templates',
  },
  {
    id: 'settings',
    label: {
      nl: 'Instellingen',
      en: 'Settings',
    },
    path: '/lca/settings',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determines if a tab is currently active based on pathname
 *
 * @param tabPath - The tab's path
 * @param pathname - Current pathname
 * @returns Whether the tab is active
 */
function isTabActive(tabPath: string, pathname: string): boolean {
  // Remove locale prefix from pathname
  const cleanPathname = pathname.replace(/^\/(nl|en)/, '');

  // Exact match or starts with the tab path
  return cleanPathname === tabPath || cleanPathname.startsWith(`${tabPath}/`);
}

// ============================================
// COMPONENT
// ============================================

/**
 * LCA Tab Navigation Component
 *
 * @example
 * ```tsx
 * <LCATabNavigation locale="nl" />
 * ```
 */
export function LCATabNavigation({
  locale = 'nl',
  className,
}: LCATabNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'border-b border-gray-200 bg-white',
        className
      )}
      role="navigation"
      aria-label={locale === 'nl' ? 'LCA navigatie' : 'LCA navigation'}
    >
      <div className="container mx-auto px-4">
        <div className="flex space-x-8" role="tablist">
          {TABS.map((tab) => {
            const isActive = isTabActive(tab.path, pathname);
            const label = tab.label[locale];

            return (
              <Link
                key={tab.id}
                href={`/${locale}${tab.path}`}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  // Base styles
                  'relative py-4 px-1 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'hover:text-gray-700',

                  // Active state
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500',

                  // Hover state (only when not active)
                  !isActive && 'hover:border-gray-300'
                )}
              >
                {/* Tab label */}
                <span>{label}</span>

                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

LCATabNavigation.displayName = 'LCATabNavigation';

export default LCATabNavigation;

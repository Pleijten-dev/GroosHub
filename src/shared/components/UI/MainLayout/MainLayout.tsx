// src/shared/components/UI/MainLayout/MainLayout.tsx
'use client';

import React from 'react';
import { cn } from '../../../utils/cn';

export interface MainLayoutProps {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** The sidebar component */
  sidebar: React.ReactNode;
  /** The main content */
  children: React.ReactNode;
  /** Additional className for the main content area */
  mainClassName?: string;
  /** Additional className for the outer container */
  className?: string;
}

/**
 * MainLayout - Unified layout component for pages with sidebar
 *
 * Uses CSS variables for consistent dimensions (defined in globals.css):
 * - --sidebar-width: expanded sidebar width
 * - --sidebar-collapsed-width: collapsed sidebar width
 * - --sidebar-gap: gap between sidebar and main content
 * - --navbar-height: height of the navbar
 */
export function MainLayout({
  isCollapsed,
  sidebar,
  children,
  mainClassName,
  className,
}: MainLayoutProps) {
  // Use CSS variables for margin calculation
  const marginLeft = isCollapsed
    ? 'calc(var(--sidebar-collapsed-width) + var(--sidebar-gap))'
    : 'calc(var(--sidebar-width) + var(--sidebar-gap))';

  return (
    <div
      className={cn('content-frame flex overflow-hidden', className)}
      style={{ height: 'calc(100vh - var(--navbar-height))' }}
    >
      {/* Sidebar - rendered but layout handled by fixed positioning */}
      {sidebar}

      {/* Main content area with proper margins */}
      <main
        className={cn(
          // Base layout classes - same for all pages
          'content-main flex-1 flex flex-col overflow-auto',
          // Transition for smooth sidebar toggle
          'transition-[margin] duration-200',
          // Additional page-specific classes
          mainClassName
        )}
        style={{ marginLeft }}
      >
        {children}
      </main>
    </div>
  );
}

MainLayout.displayName = 'MainLayout';

export default MainLayout;

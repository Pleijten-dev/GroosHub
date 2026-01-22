// src/shared/components/UI/MainLayout/MainLayout.tsx
'use client';

import React from 'react';
import { cn } from '../../../utils/cn';

export interface MainLayoutProps {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** Width of the sidebar when expanded (default: 320px) */
  sidebarExpandedWidth?: number;
  /** Width of the sidebar when collapsed (default: 60px) */
  sidebarCollapsedWidth?: number;
  /** Gap between sidebar and main content (default: 8px) */
  gap?: number;
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
 * Provides consistent layout structure with:
 * - White outer frame (content-frame)
 * - Rounded main content area with gradient background (content-main)
 * - Proper margin handling for sidebar state
 */
export function MainLayout({
  isCollapsed,
  sidebarExpandedWidth = 320,
  sidebarCollapsedWidth = 60,
  gap = 8,
  sidebar,
  children,
  mainClassName,
  className,
}: MainLayoutProps) {
  // Calculate margin based on sidebar state + gap
  const sidebarWidth = isCollapsed ? sidebarCollapsedWidth : sidebarExpandedWidth;
  const marginLeft = sidebarWidth + gap;

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
          'content-main flex-1 overflow-hidden transition-[margin] duration-200',
          mainClassName
        )}
        style={{ marginLeft: `${marginLeft}px` }}
      >
        {children}
      </main>
    </div>
  );
}

MainLayout.displayName = 'MainLayout';

export default MainLayout;

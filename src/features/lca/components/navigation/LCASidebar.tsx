/**
 * LCA Sidebar Component
 *
 * Left sidebar for LCA section showing project list, quick actions,
 * and navigation to Templates and Materials Database.
 *
 * Features:
 * - Project list with MPG score badges
 * - Active/hover states
 * - Collapsible "Recent Projects" section
 * - [+ New Project] button
 * - Links to Templates and Materials Database
 * - Project context menus
 * - Responsive (collapsible on mobile)
 *
 * @module features/lca/components/navigation
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/utils/cn';
import { MPGScoreBadge } from '@/features/lca/components/ui';
import { ProjectContextMenu } from './ProjectContextMenu';
import type { LCAProject } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LCASidebarProps {
  /** List of user's projects */
  projects?: LCAProject[];
  /** Currently selected project ID */
  currentProjectId?: string;
  /** Callback when New Project is clicked */
  onNewProject?: () => void;
  /** Callback when a project is opened */
  onOpenProject?: (projectId: string) => void;
  /** Callback when a project is duplicated */
  onDuplicateProject?: (projectId: string) => void;
  /** Callback when a project is deleted */
  onDeleteProject?: (projectId: string) => void;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
  /** Whether sidebar is collapsed (mobile) */
  isCollapsed?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'LCA Projecten',
    newProject: 'Nieuw Project',
    recentProjects: 'Recente Projecten',
    allProjects: 'Alle Projecten',
    templates: 'Sjablonen',
    materials: 'Materialen Database',
    noProjects: 'Nog geen projecten',
    createFirst: 'Maak je eerste LCA project',
  },
  en: {
    title: 'LCA Projects',
    newProject: 'New Project',
    recentProjects: 'Recent Projects',
    allProjects: 'All Projects',
    templates: 'Templates',
    materials: 'Materials Database',
    noProjects: 'No projects yet',
    createFirst: 'Create your first LCA project',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sorts projects by updated_at date (most recent first)
 */
function sortProjectsByDate(projects: LCAProject[]): LCAProject[] {
  return [...projects].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Gets recent projects (max 5)
 */
function getRecentProjects(projects: LCAProject[]): LCAProject[] {
  return sortProjectsByDate(projects).slice(0, 5);
}

// ============================================
// COMPONENT
// ============================================

/**
 * LCA Sidebar Component
 *
 * @example
 * ```tsx
 * <LCASidebar
 *   projects={userProjects}
 *   currentProjectId={currentId}
 *   onNewProject={() => setShowModal(true)}
 *   onOpenProject={(id) => router.push(`/lca/projects/${id}`)}
 *   locale="nl"
 * />
 * ```
 */
export function LCASidebar({
  projects = [],
  currentProjectId,
  onNewProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  locale = 'nl',
  className,
  isCollapsed = false,
}: LCASidebarProps) {
  const pathname = usePathname();
  const t = TRANSLATIONS[locale];
  const [showAllProjects, setShowAllProjects] = useState(false);

  const recentProjects = getRecentProjects(projects);
  const displayProjects = showAllProjects ? projects : recentProjects;

  // ============================================
  // RENDER - EMPTY STATE
  // ============================================

  if (projects.length === 0) {
    return (
      <aside
        className={cn(
          'flex h-full flex-col border-r border-gray-200 bg-white',
          isCollapsed && 'hidden lg:flex',
          className
        )}
        style={{ width: '280px' }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
        </div>

        {/* Empty State */}
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 text-4xl">📊</div>
          <p className="mb-2 text-sm font-medium text-gray-700">{t.noProjects}</p>
          <p className="mb-4 text-xs text-gray-500">{t.createFirst}</p>
          <button
            type="button"
            onClick={onNewProject}
            className={cn(
              'rounded-base bg-primary px-4 py-2 text-sm font-medium text-white',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'transition-colors'
            )}
          >
            {t.newProject}
          </button>
        </div>

        {/* Quick Links */}
        <div className="border-t border-gray-200 p-4">
          <nav className="space-y-1">
            <Link
              href={`/${locale}/lca/templates`}
              className="flex items-center gap-2 rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span>📋</span>
              <span>{t.templates}</span>
            </Link>
            <Link
              href={`/${locale}/lca/materials`}
              className="flex items-center gap-2 rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <span>🔍</span>
              <span>{t.materials}</span>
            </Link>
          </nav>
        </div>
      </aside>
    );
  }

  // ============================================
  // RENDER - WITH PROJECTS
  // ============================================

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white',
        isCollapsed && 'hidden lg:flex',
        className
      )}
      style={{ width: '280px' }}
      role="navigation"
      aria-label={t.title}
    >
      {/* Header with New Project Button */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
        </div>
        <button
          type="button"
          onClick={onNewProject}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-base',
            'bg-primary px-4 py-2 text-sm font-medium text-white',
            'hover:bg-primary/90',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'transition-colors'
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{t.newProject}</span>
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {displayProjects.map((project) => {
            const isActive =
              pathname.includes(project.id) || currentProjectId === project.id;

            return (
              <div
                key={project.id}
                className={cn(
                  'group relative flex items-start gap-2 rounded-base p-3',
                  'transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-gray-50'
                )}
              >
                {/* Project Info - Clickable */}
                <button
                  type="button"
                  onClick={() => onOpenProject?.(project.id)}
                  className="flex flex-1 flex-col items-start gap-2 text-left"
                >
                  {/* Project Name */}
                  <span className="text-sm font-medium text-gray-900 line-clamp-2">
                    {project.name}
                  </span>

                  {/* MPG Badge */}
                  {project.total_gwp_per_m2_year !== null &&
                    project.mpg_reference_value !== null && (
                      <MPGScoreBadge
                        score={Number(project.total_gwp_per_m2_year)}
                        limit={Number(project.mpg_reference_value)}
                        size="sm"
                        showLabel={false}
                        locale={locale}
                      />
                    )}

                  {/* Building Type */}
                  <span className="text-xs text-gray-500">
                    {project.building_type}
                  </span>
                </button>

                {/* Context Menu */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ProjectContextMenu
                    projectId={project.id}
                    projectName={project.name}
                    onOpen={onOpenProject}
                    onDuplicate={onDuplicateProject}
                    onDelete={onDeleteProject}
                    locale={locale}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Show All Toggle */}
        {projects.length > 5 && !showAllProjects && (
          <button
            type="button"
            onClick={() => setShowAllProjects(true)}
            className="mt-4 w-full rounded-base px-3 py-2 text-sm text-primary hover:bg-primary/5"
          >
            {t.allProjects} ({projects.length})
          </button>
        )}
      </div>

      {/* Quick Links Footer */}
      <div className="border-t border-gray-200 p-4">
        <nav className="space-y-1">
          <Link
            href={`/${locale}/lca/templates`}
            className={cn(
              'flex items-center gap-2 rounded-base px-3 py-2 text-sm transition-colors',
              pathname.includes('/lca/templates')
                ? 'bg-primary/10 text-primary'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <span>📋</span>
            <span>{t.templates}</span>
          </Link>
          <Link
            href={`/${locale}/lca/materials`}
            className={cn(
              'flex items-center gap-2 rounded-base px-3 py-2 text-sm transition-colors',
              pathname.includes('/lca/materials')
                ? 'bg-primary/10 text-primary'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <span>🔍</span>
            <span>{t.materials}</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}

LCASidebar.displayName = 'LCASidebar';

export default LCASidebar;

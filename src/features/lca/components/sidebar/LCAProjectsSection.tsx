/**
 * LCA Projects Section Component
 *
 * Sidebar section for LCA projects, designed to be used with the
 * shared Sidebar component as section content.
 *
 * Structure:
 * - Section header with [+ New Project] button
 * - Active Projects subsection
 * - Recent Projects subsection (collapsible)
 * - Links to Templates and Materials Database
 *
 * @module features/lca/components/sidebar
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/shared/utils/cn';
import { LCAProjectCard } from './LCAProjectCard';
import type { LCAProject } from '@/features/lca/types';

// ============================================
// TYPES
// ============================================

export interface LCAProjectsSectionProps {
  /** List of user's projects */
  projects?: LCAProject[];
  /** Currently active project ID */
  activeProjectId?: string;
  /** Callback when New Project button is clicked */
  onNewProject?: () => void;
  /** Callback when a project is selected */
  onSelectProject?: (projectId: string) => void;
  /** Callback when a project is opened */
  onOpenProject?: (projectId: string) => void;
  /** Callback when a project is duplicated */
  onDuplicateProject?: (projectId: string) => void;
  /** Callback when a project is deleted */
  onDeleteProject?: (projectId: string) => void;
  /** Locale */
  locale?: 'nl' | 'en';
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'LCA PROJECTEN',
    newProject: 'Nieuw',
    recentProjects: 'Recente Projecten',
    allProjects: 'Alle Projecten',
    show: 'Toon',
    hide: 'Verberg',
    templates: 'Templates',
    templatesCount: 'sjablonen',
    materials: 'Materialen Database',
    noProjects: 'Nog geen projecten',
    createFirst: 'Maak je eerste project',
  },
  en: {
    title: 'LCA PROJECTS',
    newProject: 'New',
    recentProjects: 'Recent Projects',
    allProjects: 'All Projects',
    show: 'Show',
    hide: 'Hide',
    templates: 'Templates',
    templatesCount: 'templates',
    materials: 'Materials Database',
    noProjects: 'No projects yet',
    createFirst: 'Create your first project',
  },
};

// Maximum number of projects to show before collapsing
const MAX_VISIBLE_PROJECTS = 3;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sorts projects by updated date (most recent first)
 */
function sortByDate(projects: LCAProject[]): LCAProject[] {
  return [...projects].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

// ============================================
// COMPONENT
// ============================================

/**
 * LCA Projects Section
 *
 * @example
 * ```tsx
 * <LCAProjectsSection
 *   projects={userProjects}
 *   activeProjectId={currentId}
 *   onNewProject={() => setShowModal(true)}
 *   onOpenProject={(id) => router.push(`/lca/projects/${id}`)}
 *   locale="nl"
 * />
 * ```
 */
export function LCAProjectsSection({
  projects = [],
  activeProjectId,
  onNewProject,
  onSelectProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  locale = 'nl',
}: LCAProjectsSectionProps) {
  const t = TRANSLATIONS[locale];
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const sortedProjects = sortByDate(projects);
  const recentProjects = sortedProjects.slice(0, MAX_VISIBLE_PROJECTS);
  const hasMoreProjects = sortedProjects.length > MAX_VISIBLE_PROJECTS;

  // Handle project click - expand the clicked project
  const handleProjectClick = (projectId: string) => {
    setExpandedProjectId(projectId === expandedProjectId ? null : projectId);
    onSelectProject?.(projectId);
  };

  // ============================================
  // RENDER - EMPTY STATE
  // ============================================

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            {t.title}
          </h3>
          <button
            type="button"
            onClick={onNewProject}
            className={cn(
              'flex items-center gap-1.5 rounded-base px-2.5 py-1',
              'bg-primary text-xs font-medium text-white',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t.newProject}</span>
          </button>
        </div>

        {/* Empty State */}
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="mb-1 text-sm font-medium text-gray-700">{t.noProjects}</p>
          <p className="text-xs text-gray-500">{t.createFirst}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Quick Links */}
        <div className="space-y-1">
          <Link
            href={`/${locale}/lca/templates`}
            className="rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors block"
          >
            {t.templates} (8)
          </Link>
          <Link
            href={`/${locale}/lca/materials`}
            className="rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors block"
          >
            {t.materials}
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - WITH PROJECTS
  // ============================================

  return (
    <div className="space-y-4">
      {/* Section Header with [+] Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {t.title}
        </h3>
        <button
          type="button"
          onClick={onNewProject}
          className={cn(
            'flex items-center gap-1.5 rounded-base px-2.5 py-1',
            'bg-primary text-xs font-medium text-white',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{t.newProject}</span>
        </button>
      </div>

      {/* Recent Projects (Top 3, Non-collapsible) */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-600 px-2">{t.recentProjects}</h4>
        {recentProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isExpanded = project.id === expandedProjectId;

          return (
            <LCAProjectCard
              key={project.id}
              project={project}
              isActive={isActive}
              isExpanded={isExpanded}
              onClick={handleProjectClick}
              onOpen={onOpenProject}
              onDuplicate={onDuplicateProject}
              onDelete={onDeleteProject}
              locale={locale}
            />
          );
        })}
      </div>

      {/* All Projects (Collapsible) */}
      {hasMoreProjects && (
        <>
          <div className="border-t border-gray-200" />

          <div className="space-y-2">
            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAllProjects(!showAllProjects)}
              className="flex w-full items-center justify-between rounded-base px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{t.allProjects}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {showAllProjects ? t.hide : t.show} ({sortedProjects.length})
                </span>
                <svg
                  className={cn(
                    'h-4 w-4 transition-transform',
                    showAllProjects ? 'rotate-180' : 'rotate-0'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* All Projects List */}
            {showAllProjects && (
              <div className="space-y-1">
                {sortedProjects.map((project) => {
                  const isActive = project.id === activeProjectId;
                  const isExpanded = project.id === expandedProjectId;

                  return (
                    <LCAProjectCard
                      key={project.id}
                      project={project}
                      isActive={isActive}
                      isExpanded={isExpanded}
                      onClick={handleProjectClick}
                      onOpen={onOpenProject}
                      onDuplicate={onDuplicateProject}
                      onDelete={onDeleteProject}
                      locale={locale}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Quick Links */}
      <div className="space-y-1">
        <Link
          href={`/${locale}/lca/templates`}
          className="rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors block"
        >
          {t.templates} (8)
        </Link>
        <Link
          href={`/${locale}/lca/materials`}
          className="rounded-base px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors block"
        >
          {t.materials}
        </Link>
      </div>
    </div>
  );
}

LCAProjectsSection.displayName = 'LCAProjectsSection';

export default LCAProjectsSection;

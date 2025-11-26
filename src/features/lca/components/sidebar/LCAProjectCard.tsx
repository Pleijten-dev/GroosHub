/**
 * LCA Project Card Component
 *
 * Displays an LCA project in the sidebar with three states:
 * 1. Active/Expanded - Full details with large MPG display
 * 2. Collapsed - Compact view with name and MPG
 * 3. Hover - Shows action buttons
 *
 * @module features/lca/components/sidebar
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import { MPGScoreBadge } from '@/features/lca/components/ui';
import { ProjectContextMenu } from '@/features/lca/components/navigation';
import type { LCAProject } from '@/features/lca/types';

// ============================================
// TYPES
// ============================================

export interface LCAProjectCardProps {
  /** The project to display */
  project: LCAProject;
  /** Whether this is the currently active/selected project */
  isActive?: boolean;
  /** Whether to show in expanded state */
  isExpanded?: boolean;
  /** Callback when project is clicked */
  onClick?: (projectId: string) => void;
  /** Callback when project is opened */
  onOpen?: (projectId: string) => void;
  /** Callback when project is duplicated */
  onDuplicate?: (projectId: string) => void;
  /** Callback when project is deleted */
  onDelete?: (projectId: string) => void;
  /** Locale */
  locale?: 'nl' | 'en';
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    lastEdited: 'Laatst bewerkt',
    open: 'Openen',
    m2: 'm²',
    hoursAgo: 'uur geleden',
    daysAgo: 'dagen geleden',
    minutesAgo: 'minuten geleden',
    justNow: 'zojuist',
  },
  en: {
    lastEdited: 'Last edited',
    open: 'Open',
    m2: 'm²',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    minutesAgo: 'minutes ago',
    justNow: 'just now',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(date: Date, locale: 'nl' | 'en'): string {
  const t = TRANSLATIONS[locale];
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return `${diffMins} ${t.minutesAgo}`;
  if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;
  return `${diffDays} ${t.daysAgo}`;
}

// ============================================
// COMPONENT
// ============================================

/**
 * LCA Project Card
 *
 * @example
 * ```tsx
 * <LCAProjectCard
 *   project={project}
 *   isActive={true}
 *   isExpanded={true}
 *   onClick={(id) => setActiveProject(id)}
 *   locale="nl"
 * />
 * ```
 */
export function LCAProjectCard({
  project,
  isActive = false,
  isExpanded = false,
  onClick,
  onOpen,
  onDuplicate,
  onDelete,
  locale = 'nl',
}: LCAProjectCardProps) {
  const t = TRANSLATIONS[locale];
  const [isHovered, setIsHovered] = React.useState(false);

  const showActions = isHovered || isActive;
  const timeAgo = formatTimeAgo(project.updated_at, locale);

  // ============================================
  // EXPANDED STATE (Active Project)
  // ============================================

  if (isExpanded) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 p-4 transition-all',
          isActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-white hover:border-gray-300'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Project Name */}
        <h3 className="mb-3 text-base font-semibold text-gray-900 line-clamp-2">
          {project.name}
        </h3>

        {/* Quick Info */}
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <span>
            {project.gross_floor_area} {t.m2}
          </span>
          <span>·</span>
          <span className="capitalize">{project.construction_system || project.building_type}</span>
        </div>

        {/* Large MPG Display */}
        {project.total_gwp_per_m2_year !== null &&
          project.mpg_reference_value !== null && (
            <div className="mb-3 rounded-lg border-2 border-gray-200 bg-white p-3">
              <div className="mb-2 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Number(project.total_gwp_per_m2_year).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">kg CO₂/m²/jr</div>
              </div>
              <MPGScoreBadge
                score={Number(project.total_gwp_per_m2_year)}
                limit={Number(project.mpg_reference_value)}
                size="sm"
                showLabel={true}
                locale={locale}
                className="w-full justify-center"
              />
            </div>
          )}

        {/* Last Edited */}
        <div className="mb-3 text-xs text-gray-500">
          {t.lastEdited}: {timeAgo}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen?.(project.id)}
            className={cn(
              'flex-1 rounded-base px-3 py-1.5 text-sm font-medium transition-colors',
              'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {t.open}
          </button>
          <ProjectContextMenu
            projectId={project.id}
            projectName={project.name}
            onOpen={onOpen}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            locale={locale}
          />
        </div>
      </div>
    );
  }

  // ============================================
  // COLLAPSED STATE (Compact)
  // ============================================

  return (
    <button
      type="button"
      onClick={() => onClick?.(project.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-full rounded-base p-3 text-left transition-all',
        isActive
          ? 'bg-primary/10 ring-1 ring-primary'
          : 'hover:bg-gray-50'
      )}
    >
      {/* Project Name */}
      <div className="mb-2 text-sm font-medium text-gray-900 line-clamp-1">
        {project.name}
      </div>

      {/* MPG Value */}
      {project.total_gwp_per_m2_year !== null && (
        <div className="mb-1 text-xs text-gray-600">
          {Number(project.total_gwp_per_m2_year).toFixed(2)} kg CO₂
        </div>
      )}

      {/* Actions (shown on hover) */}
      {showActions && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(project.id);
            }}
            className="flex-1 rounded-sm bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90"
          >
            {t.open}
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <ProjectContextMenu
              projectId={project.id}
              projectName={project.name}
              onOpen={onOpen}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              locale={locale}
              className="h-6 w-6"
            />
          </div>
        </div>
      )}
    </button>
  );
}

LCAProjectCard.displayName = 'LCAProjectCard';

export default LCAProjectCard;

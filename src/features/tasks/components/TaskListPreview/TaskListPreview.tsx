/**
 * TaskListPreview Component
 *
 * A compact, scrollable list of tasks for sidebar display.
 * Shows task title, assignee, deadline, and priority.
 *
 * Features:
 * - Sort toggle (creation date / deadline)
 * - Compact task cards
 * - Priority indicators
 * - Deadline badges
 * - Click to navigate to task
 */

'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// Types
// ============================================================================

export interface TaskPreview {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: Date | string | null;
  createdAt: Date | string;
  assignedUsers?: Array<{
    id: string;
    name: string;
  }>;
  projectName?: string;
  isOverdue?: boolean;
  daysUntilDeadline?: number | null;
}

export interface TaskListPreviewProps {
  /** Array of tasks to display */
  tasks: TaskPreview[];
  /** Current sort method */
  sortBy?: 'created' | 'deadline';
  /** Called when sort method changes */
  onSortChange?: (sort: 'created' | 'deadline') => void;
  /** Called when a task is clicked */
  onTaskClick?: (taskId: string) => void;
  /** Maximum number of visible tasks (rest scrollable) */
  maxVisible?: number;
  /** Show project name for each task */
  showProject?: boolean;
  /** Current locale */
  locale?: 'nl' | 'en';
  /** Additional class names */
  className?: string;
  /** Title for the list */
  title?: string;
  /** Link to view all tasks */
  viewAllLink?: string;
  /** Called when view all is clicked */
  onViewAllClick?: () => void;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    title: 'Openstaande taken',
    sortByDeadline: 'Deadline',
    sortByCreated: 'Aangemaakt',
    noTasks: 'Geen openstaande taken',
    viewAll: 'Bekijk alle',
    overdue: 'Achterstallig',
    dueToday: 'Vandaag',
    dueTomorrow: 'Morgen',
    dueIn: 'Over',
    days: 'dagen',
    noDue: 'Geen deadline',
    priorities: {
      urgent: 'Urgent',
      high: 'Hoog',
      normal: 'Normaal',
      low: 'Laag',
    },
  },
  en: {
    title: 'Open tasks',
    sortByDeadline: 'Deadline',
    sortByCreated: 'Created',
    noTasks: 'No open tasks',
    viewAll: 'View all',
    overdue: 'Overdue',
    dueToday: 'Today',
    dueTomorrow: 'Tomorrow',
    dueIn: 'In',
    days: 'days',
    noDue: 'No deadline',
    priorities: {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
      low: 'Low',
    },
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'normal':
      return 'bg-blue-500';
    case 'low':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'todo':
      return 'text-gray-500';
    case 'doing':
      return 'text-blue-600';
    case 'done':
      return 'text-green-600';
    default:
      return 'text-gray-500';
  }
}

function formatDeadline(
  deadline: Date | string | null | undefined,
  daysUntil: number | null | undefined,
  isOverdue: boolean | undefined,
  t: typeof translations.nl
): { text: string; className: string } {
  if (!deadline) {
    return { text: t.noDue, className: 'text-gray-400' };
  }

  if (isOverdue) {
    return { text: t.overdue, className: 'text-red-600 font-medium' };
  }

  if (daysUntil === 0) {
    return { text: t.dueToday, className: 'text-orange-600 font-medium' };
  }

  if (daysUntil === 1) {
    return { text: t.dueTomorrow, className: 'text-yellow-600' };
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    return {
      text: `${t.dueIn} ${daysUntil} ${t.days}`,
      className: daysUntil <= 3 ? 'text-yellow-600' : 'text-gray-500',
    };
  }

  return { text: t.noDue, className: 'text-gray-400' };
}

// ============================================================================
// Component
// ============================================================================

export function TaskListPreview({
  tasks,
  sortBy = 'deadline',
  onSortChange,
  onTaskClick,
  maxVisible = 5,
  showProject = true,
  locale = 'nl',
  className,
  title,
  onViewAllClick,
}: TaskListPreviewProps) {
  const [internalSortBy, setInternalSortBy] = useState<'created' | 'deadline'>(sortBy);

  const t = translations[locale];
  const currentSort = onSortChange ? sortBy : internalSortBy;

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].filter((task) => task.status !== 'done');

    if (currentSort === 'deadline') {
      sorted.sort((a, b) => {
        // Tasks with deadlines first
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        const dateA = new Date(a.deadline);
        const dateB = new Date(b.deadline);
        return dateA.getTime() - dateB.getTime();
      });
    } else {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Newest first
      });
    }

    return sorted;
  }, [tasks, currentSort]);

  const handleSortChange = (sort: 'created' | 'deadline') => {
    if (onSortChange) {
      onSortChange(sort);
    } else {
      setInternalSortBy(sort);
    }
  };

  const displayTasks = sortedTasks.slice(0, maxVisible);
  const hasMore = sortedTasks.length > maxVisible;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-base py-sm border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          {title || t.title}
        </h3>

        {/* Sort toggle */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => handleSortChange('deadline')}
            className={cn(
              'px-2 py-1 text-xs transition-colors',
              currentSort === 'deadline'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {t.sortByDeadline}
          </button>
          <button
            type="button"
            onClick={() => handleSortChange('created')}
            className={cn(
              'px-2 py-1 text-xs transition-colors border-l border-gray-200',
              currentSort === 'created'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {t.sortByCreated}
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {displayTasks.length === 0 ? (
          <div className="px-base py-lg text-center text-sm text-gray-400">
            {t.noTasks}
          </div>
        ) : (
          displayTasks.map((task) => {
            const deadline = formatDeadline(
              task.deadline,
              task.daysUntilDeadline,
              task.isOverdue,
              t
            );

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick?.(task.id)}
                className="w-full text-left px-base py-sm hover:bg-gray-50 transition-colors flex items-start gap-sm"
              >
                {/* Priority indicator */}
                <div
                  className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', getPriorityColor(task.priority))}
                  title={t.priorities[task.priority]}
                />

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm text-gray-900 truncate">{task.title}</h4>
                    <span className={cn('text-xs flex-shrink-0', deadline.className)}>
                      {deadline.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Status */}
                    <span className={cn('text-xs capitalize', getStatusColor(task.status))}>
                      {task.status}
                    </span>

                    {/* Project name */}
                    {showProject && task.projectName && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500 truncate">
                          {task.projectName}
                        </span>
                      </>
                    )}

                    {/* Assigned users */}
                    {task.assignedUsers && task.assignedUsers.length > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center -space-x-1">
                          {task.assignedUsers.slice(0, 3).map((user, index) => (
                            <div
                              key={user.id}
                              className="w-4 h-4 rounded-full bg-gray-300 border border-white flex items-center justify-center"
                              title={user.name}
                              style={{ zIndex: 3 - index }}
                            >
                              <span className="text-[8px] font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {task.assignedUsers.length > 3 && (
                            <div className="w-4 h-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                              <span className="text-[8px] font-medium text-gray-500">
                                +{task.assignedUsers.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })
        )}
      </div>

      {/* Footer - View all link */}
      {(hasMore || onViewAllClick) && (
        <div className="px-base py-sm border-t border-gray-200">
          <button
            type="button"
            onClick={onViewAllClick}
            className="w-full text-center text-sm text-primary hover:text-primary-hover transition-colors font-medium"
          >
            {t.viewAll}
            {hasMore && ` (${sortedTasks.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

TaskListPreview.displayName = 'TaskListPreview';

export default TaskListPreview;

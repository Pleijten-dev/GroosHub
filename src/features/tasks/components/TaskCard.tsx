'use client';

import React from 'react';
import type { Task } from '../types';

export interface TaskCardProps {
  task: Task;
  onDragStart: (task: Task) => void;
  onClick: () => void;
  locale: string;
}

export function TaskCard({ task, onDragStart, onClick, locale }: TaskCardProps) {
  const priorityColors = {
    urgent: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    normal: 'border-gray-300 bg-white',
    low: 'border-gray-200 bg-gray-50'
  };

  const priorityLabels = {
    nl: {
      urgent: 'Urgent',
      high: 'Hoog',
      normal: 'Normaal',
      low: 'Laag'
    },
    en: {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
      low: 'Low'
    }
  };

  const t = priorityLabels[locale as keyof typeof priorityLabels] || priorityLabels.en;

  function formatDeadline(deadline: string | null): string {
    if (!deadline) return '';

    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return locale === 'nl' ? `${Math.abs(diffDays)}d te laat` : `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return locale === 'nl' ? 'Vandaag' : 'Today';
    } else if (diffDays === 1) {
      return locale === 'nl' ? 'Morgen' : 'Tomorrow';
    } else if (diffDays <= 7) {
      return locale === 'nl' ? `${diffDays} dagen` : `${diffDays} days`;
    }

    return date.toLocaleDateString(locale);
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={onClick}
      className={`
        p-3 border rounded-lg cursor-pointer
        transition-all duration-200
        hover:shadow-md hover:scale-[1.02]
        ${priorityColors[task.priority]}
        ${task.is_overdue ? 'border-red-500 bg-red-50' : ''}
      `}
    >
      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Metadata */}
      <div className="space-y-1.5">
        {/* Group */}
        {task.group_name && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border border-gray-300"
              style={{ backgroundColor: task.group_color || '#gray' }}
            />
            <span className="text-xs text-gray-600">{task.group_name}</span>
          </div>
        )}

        {/* Priority */}
        {task.priority !== 'normal' && (
          <div className="text-xs text-gray-600">
            {t[task.priority]}
          </div>
        )}

        {/* Deadline */}
        {task.deadline && (
          <div className={`text-xs ${task.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {formatDeadline(task.deadline)}
          </div>
        )}

        {/* Assigned Users */}
        {task.assigned_users && task.assigned_users.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {task.assigned_users.slice(0, 3).map((user, index) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium"
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {task.assigned_users.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-medium">
                +{task.assigned_users.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Note count */}
        {task.note_count && task.note_count > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {task.note_count} {locale === 'nl' ? 'notitie' : 'note'}{task.note_count > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;

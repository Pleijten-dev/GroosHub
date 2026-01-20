'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { TaskCalendarView } from '@/features/tasks/components/TaskCalendarView';
import { TaskDetailModal } from '@/features/tasks/components/TaskDetailModal';
import type { Task, TaskGroup } from '@/features/tasks/types';

export interface MyTasksClientProps {
  locale: string;
}

export default function MyTasksClient({ locale }: MyTasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'list'>('calendar');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  const translations = {
    nl: {
      myTasks: 'Mijn Taken',
      calendarView: 'Kalender',
      listView: 'Lijst',
      allTasks: 'Alle Taken',
      overdue: 'Achterstallig',
      upcoming: 'Binnenkort',
      loading: 'Laden...',
      error: 'Fout bij laden taken',
      noTasks: 'Geen taken',
      project: 'Project',
      status: 'Status',
      priority: 'Prioriteit',
      deadline: 'Deadline',
      group: 'Groep',
      todo: 'Te doen',
      doing: 'Bezig',
      done: 'Klaar',
      urgent: 'Urgent',
      high: 'Hoog',
      normal: 'Normaal',
      low: 'Laag',
      noDeadline: 'Geen deadline'
    },
    en: {
      myTasks: 'My Tasks',
      calendarView: 'Calendar',
      listView: 'List',
      allTasks: 'All Tasks',
      overdue: 'Overdue',
      upcoming: 'Upcoming',
      loading: 'Loading...',
      error: 'Error loading tasks',
      noTasks: 'No tasks',
      project: 'Project',
      status: 'Status',
      priority: 'Priority',
      deadline: 'Deadline',
      group: 'Group',
      todo: 'To Do',
      doing: 'Doing',
      done: 'Done',
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
      low: 'Low',
      noDeadline: 'No deadline'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchUserTasks();
  }, [filter]);

  async function fetchUserTasks() {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter === 'overdue') params.append('overdue', 'true');
      if (filter === 'upcoming') params.append('upcoming', 'true');

      const res = await fetch(`/api/tasks/user?${params.toString()}`);

      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await res.json();
      setTasks(data.data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateTask(taskId: string, updates: any) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const res = await fetch(`/api/projects/${task.project_id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        await fetchUserTasks();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  async function handleDeleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${task.project_id}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchUserTasks();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const priorityColors = {
    urgent: 'text-red-600',
    high: 'text-orange-600',
    normal: 'text-gray-600',
    low: 'text-gray-500'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">{t.myTasks}</h1>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentView === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.calendarView}
            </button>
            <button
              onClick={() => setCurrentView('list')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.listView}
            </button>
          </div>

          {/* Filter toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.allTasks}
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filter === 'overdue'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.overdue}
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filter === 'upcoming'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.upcoming}
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {currentView === 'calendar' ? (
        <TaskCalendarView
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
          locale={locale}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div className="col-span-2">{t.project}</div>
            <div>{t.status}</div>
            <div>{t.priority}</div>
            <div>{t.deadline}</div>
            <div>{t.group}</div>
          </div>

          {/* Table body */}
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t.noTasks}</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full grid grid-cols-6 gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="col-span-2">
                    <div className="font-medium text-gray-900 truncate">{task.title}</div>
                    <div className="text-sm text-gray-500 truncate">{task.project_name}</div>
                  </div>
                  <div className="text-sm text-gray-700 capitalize">{t[task.status as keyof typeof t]}</div>
                  <div className={`text-sm font-medium capitalize ${priorityColors[task.priority]}`}>
                    {t[task.priority]}
                  </div>
                  <div className="text-sm text-gray-700">
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString(locale)
                      : t.noDeadline
                    }
                  </div>
                  <div className="text-sm text-gray-700 truncate">
                    {task.group_name || '-'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={selectedTask.project_id || ''}
          groups={groups}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updates) => {
            await handleUpdateTask(selectedTask.id, updates);
            setSelectedTask(null);
          }}
          onDelete={async () => {
            await handleDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          locale={locale}
        />
      )}
    </div>
  );
}
